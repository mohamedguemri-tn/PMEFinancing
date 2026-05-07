using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Api.Authorization;
using Infrastructure.Blockchain;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;

Microsoft.IdentityModel.Logging.IdentityModelEventSource.ShowPII = true;
Microsoft.IdentityModel.Logging.IdentityModelEventSource.LogCompleteSecurityArtifact = true;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(Application.Auth.Commands.GetNonceCommand).Assembly));

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"))
);

builder.Services.Configure<ContractConfig>(builder.Configuration.GetSection("ContractConfig"));
builder.Services.AddScoped<IBlockchainService, BlockchainService>();
builder.Services.AddScoped<DatabaseSeeder>();

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
        options.Events = new JwtBearerEvents
        {
            OnAuthenticationFailed = context =>
            {
                Console.WriteLine($"JWT FAILED: {context.Exception.Message}");
                return Task.CompletedTask;
            },
            OnTokenValidated = context =>
            {
                Console.WriteLine("JWT VALIDATED OK");
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

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var seeder = scope.ServiceProvider.GetRequiredService<DatabaseSeeder>();
    seeder.SeedAsync().GetAwaiter().GetResult();
}

app.Use(async (context, next) =>
{
    var auth = context.Request.Headers["Authorization"].ToString();
    Console.WriteLine($"RAW AUTH HEADER LENGTH: {auth.Length}");
    Console.WriteLine($"RAW AUTH HEADER: {auth}");
    await next();
});

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
app.UseAuthorization();
app.MapControllers();
app.Run();