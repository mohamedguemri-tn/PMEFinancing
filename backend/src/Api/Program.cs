using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Reflection;
using System.Text;
using System.Text.Json;
using System.Threading.RateLimiting;
using Api;
using Api.Authorization;
using Api.Hubs;
using Api.Middleware;
using Api.Services;
using Application.Common.Interfaces;
using Infrastructure.Blockchain;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Serilog;
using Serilog.Events;

var builder = WebApplication.CreateBuilder(args);

// When running in Docker, Ganache writes deployed contract addresses to a shared volume.
// Inject them into configuration before ContractConfig is bound to services.
var contractAddressesPath = Environment.GetEnvironmentVariable("CONTRACT_ADDRESSES_PATH");
if (!string.IsNullOrEmpty(contractAddressesPath) && File.Exists(contractAddressesPath))
{
    var json = await File.ReadAllTextAsync(contractAddressesPath);
    var addresses = JsonSerializer.Deserialize<Dictionary<string, string>>(json);
    if (addresses != null)
    {
        foreach (var (contractKey, contractValue) in addresses)
{
    builder.Configuration[$"ContractConfig:{contractKey}"] = contractValue;
}
    }
}

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .WriteTo.Console(new Serilog.Formatting.Compact.CompactJsonFormatter())
    .WriteTo.File("logs/app-.log", rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Host.UseSerilog((context, services, configuration) => configuration
    .ReadFrom.Configuration(context.Configuration)
    .ReadFrom.Services(services)
    .Enrich.FromLogContext()
    .WriteTo.Console(new Serilog.Formatting.Compact.CompactJsonFormatter())
    .WriteTo.File("logs/app-.log", rollingInterval: RollingInterval.Day));

builder.Services.AddControllers(options =>
{
    options.Conventions.Add(new Api.Controllers.DebugControllerConvention(builder.Environment));
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "BlockFin PME API",
        Version = "v1",
        Description = "Blockchain-based participatory financing platform for SMEs. " +
                      "Assets are tokenized as ERC-721 NFTs and used as collateral for loans.",
        Contact = new OpenApiContact
        {
            Name = "BlockFin PME",
            Url = new Uri("https://github.com/mohamedguemri-tn/PMEFinancing")
        }
    });

    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    options.IncludeXmlComments(xmlPath);

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter your JWT token. Example: eyJhbGci..."
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});
builder.Services.AddSignalR();
builder.Services.AddScoped<INotificationService, NotificationService>();

builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(Application.Auth.Commands.GetNonceCommand).Assembly));

var connectionString = Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? builder.Configuration.GetConnectionString("DefaultConnection");

// Detect PostgreSQL: connection strings starting with "Host=" or a postgres:// URI
var usePostgres = connectionString != null &&
    (connectionString.StartsWith("Host=", StringComparison.OrdinalIgnoreCase) ||
     connectionString.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
     connectionString.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase));

if (usePostgres)
{
    // Normalise a postgres:// URI to the key=value format Npgsql expects
    if (connectionString!.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
        connectionString.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
    {
        var uri      = new Uri(connectionString);
        var userInfo = uri.UserInfo.Split(':');
        var port     = uri.Port > 0 ? uri.Port : 5432;
        var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty;
        connectionString =
            $"Host={uri.Host};Port={port};" +
            $"Database={uri.AbsolutePath.TrimStart('/')};" +
            $"Username={userInfo[0]};Password={password};" +
            "SSL Mode=Require;Trust Server Certificate=true";
    }

    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(connectionString));
}
else
{
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseSqlServer(connectionString));
}

var contractConfigSection = builder.Environment.IsProduction() ? "SepoliaConfig" : "ContractConfig";
builder.Services.Configure<ContractConfig>(builder.Configuration.GetSection(contractConfigSection));
builder.Services.AddScoped<IBlockchainService, BlockchainService>();
builder.Services.AddScoped<DatabaseSeeder>();
builder.Services.AddScoped<TestDataSeeder>();
builder.Services.AddHostedService<Api.Services.BlocklistedTokenCleanupService>();

var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new Exception("JWT Secret missing");
var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = key,
            ClockSkew = TimeSpan.FromMinutes(5)
        };
        // SignalR WebSocket connections can't send custom headers — read JWT from query string.
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(accessToken) &&
                    context.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("PME", policy => policy.Requirements.Add(new RoleRequirement("PME")));
    options.AddPolicy("INVESTOR", policy => policy.Requirements.Add(new RoleRequirement("INVESTOR")));
    options.AddPolicy("GUARANTOR", policy => policy.Requirements.Add(new RoleRequirement("GUARANTOR")));
    options.AddPolicy("GOVERNOR", policy => policy.Requirements.Add(new RoleRequirement("GOVERNOR")));
});

builder.Services.AddSingleton<IAuthorizationHandler, RoleRequirementHandler>();

var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:4200" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
    // AllowCredentials() required for SignalR — cannot combine with AllowAnyOrigin().
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        context.HttpContext.Response.ContentType = "application/json";

        var retryAfter = context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfterValue)
            ? (int)retryAfterValue.TotalSeconds
            : 60;

        await context.HttpContext.Response.WriteAsJsonAsync(new
        {
            status = 429,
            message = "Too many requests. Please wait before trying again.",
            retryAfterSeconds = retryAfter
        }, cancellationToken);
    };

    // Nonce: max 5 requests per IP per minute — prevents wallet enumeration.
    options.AddFixedWindowLimiter(RateLimitPolicies.Nonce, policy =>
    {
        policy.PermitLimit = 5;
        policy.Window = TimeSpan.FromMinutes(1);
        policy.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        policy.QueueLimit = 0;
    });

    // Register: max 3 requests per IP per 10 minutes — prevents registration spam.
    options.AddFixedWindowLimiter(RateLimitPolicies.Register, policy =>
    {
        policy.PermitLimit = 3;
        policy.Window = TimeSpan.FromMinutes(10);
        policy.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        policy.QueueLimit = 0;
    });

    // Login: max 10 requests per IP per minute — more lenient; user may retry after nonce expiry.
    options.AddFixedWindowLimiter(RateLimitPolicies.Login, policy =>
    {
        policy.PermitLimit = 10;
        policy.Window = TimeSpan.FromMinutes(1);
        policy.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        policy.QueueLimit = 0;
    });
});

var app = builder.Build();

app.UseMiddleware<ExceptionMiddleware>();
app.UseSerilogRequestLogging(options =>
{
    options.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
    {
        var walletAddress = httpContext.User.FindFirst("wallet")?.Value;
        if (walletAddress != null)
        {
            diagnosticContext.Set("WalletAddress", walletAddress);
        }
    };
});

using (var scope = app.Services.CreateScope())
{
    // Force blockchain config validation on startup — throws BlockchainException if key is missing.
    scope.ServiceProvider.GetRequiredService<IBlockchainService>();

    var seeder = scope.ServiceProvider.GetRequiredService<DatabaseSeeder>();
    seeder.SeedAsync().GetAwaiter().GetResult();

    if (app.Environment.IsDevelopment())
    {
        var testSeeder = scope.ServiceProvider.GetRequiredService<TestDataSeeder>();
        testSeeder.SeedAsync().GetAwaiter().GetResult();
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors("AllowAll");
app.UseAuthentication();
app.UseRateLimiter();
app.UseMiddleware<Api.Authorization.BlocklistedTokenMiddleware>();
app.UseAuthorization();
app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications").RequireCors("AllowFrontend");

// Belt-and-suspenders: block /api/debug/* at the routing layer in non-Development.
// The controller actions already return 404 via IsDev guards, but this stops
// the request even reaching the controller if the environment var is misconfigured.
if (!app.Environment.IsDevelopment())
{
    app.Map("/api/debug/{**path}", (HttpContext ctx) =>
    {
        ctx.Response.StatusCode = 404;
        return Task.CompletedTask;
    });
}

app.Run();