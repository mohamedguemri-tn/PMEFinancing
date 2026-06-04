namespace Infrastructure.Persistence;

using Domain.Entities;
using Infrastructure.Blockchain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

/// <summary>
/// Seeds initial database data on application startup.
/// </summary>
public class DatabaseSeeder
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<DatabaseSeeder> _logger;
    private readonly IBlockchainService _blockchainService;

    public DatabaseSeeder(AppDbContext context, IConfiguration configuration, ILogger<DatabaseSeeder> logger, IBlockchainService blockchainService)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
        _blockchainService = blockchainService;
    }

    /// <summary>
    /// Ensures the database is created, applies migrations, and seeds demo accounts if they don't exist.
    /// </summary>
    public async Task SeedAsync()
    {
        _logger.LogInformation("Starting database initialisation...");
        // SQL Server: apply incremental migrations tracked in __EFMigrationsHistory.
        // PostgreSQL: EnsureCreated creates the schema directly from the EF model using
        // Npgsql's type mappings, because the existing migrations contain SQL Server-specific
        // type annotations (uniqueidentifier, nvarchar, datetime2) that are incompatible.
        var isPostgres = _context.Database.ProviderName?.Contains("Npgsql") == true;
        if (isPostgres)
            await EnsurePostgresSchemaAsync();
        else
            await _context.Database.MigrateAsync();
        _logger.LogInformation("Database initialisation completed.");

        await SeedGovernorAsync();
        await SeedDemoUsersAsync();
    }

    private async Task EnsurePostgresSchemaAsync()
    {
        // EnsureCreated()'s HasTables() check is unreliable on hosted PostgreSQL (e.g. Supabase):
        // pre-existing tables in auth/storage/realtime schemas make it return true, causing EF Core
        // to skip creating our public schema tables entirely.
        // Instead, check specifically for our tables in the public schema.
        var conn = _context.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
            await conn.OpenAsync();

        await using var cmd = conn.CreateCommand();
        cmd.CommandText =
            "SELECT COUNT(*) FROM information_schema.tables " +
            "WHERE table_schema = 'public' AND table_name = 'Users'";
        var usersExists = Convert.ToInt32(await cmd.ExecuteScalarAsync()) > 0;

        if (!usersExists)
        {
            var creator = _context.Database.GetService<IRelationalDatabaseCreator>();
            await creator.CreateTablesAsync();
            _logger.LogInformation("PostgreSQL schema created from EF model.");
        }
        else
        {
            _logger.LogInformation("PostgreSQL schema already exists, skipping creation.");
        }
    }

    private async Task SeedGovernorAsync()
    {
        if (await _context.Users.AnyAsync(u => u.Role == Role.GOVERNOR))
        {
            _logger.LogInformation("Governor account already exists. Skipping.");
            return;
        }

        var wallet = (_configuration["GovernorWallet"] ?? "0x0000000000000000000000000000000000000000").ToLower();
        _context.Users.Add(new User
        {
            WalletAddress = wallet,
            Role = Role.GOVERNOR,
            IsApproved = true,
            CreatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();
        _logger.LogInformation("Governor seeded: {Wallet}", wallet);
    }

    private async Task SeedDemoUsersAsync()
    {
        var pmeWallet      = (_configuration["DemoWallets:Pme"]      ?? string.Empty).ToLower();
        var investorWallet = (_configuration["DemoWallets:Investor"]  ?? string.Empty).ToLower();
        var guarantorWallet= (_configuration["DemoWallets:Guarantor"] ?? string.Empty).ToLower();

        if (string.IsNullOrEmpty(pmeWallet)) return;

        // PME
        if (!await _context.Users.AnyAsync(u => u.WalletAddress.ToLower() == pmeWallet))
        {
            var pme = new User
            {
                WalletAddress = pmeWallet,
                Role = Role.PME,
                IsApproved = true,
                CreatedAt = DateTime.UtcNow,
                PmeProfile = new PmeProfile
                {
                    CompanyName = "Demo PME",
                    Email       = "pme@demo.local",
                    Sector      = "Technology"
                }
            };
            _context.Users.Add(pme);
            _logger.LogInformation("Demo PME seeded: {Wallet}", pmeWallet);
        }

        // Investor
        if (!string.IsNullOrEmpty(investorWallet) &&
            !await _context.Users.AnyAsync(u => u.WalletAddress.ToLower() == investorWallet))
        {
            var investor = new User
            {
                WalletAddress = investorWallet,
                Role = Role.INVESTOR,
                IsApproved = true,
                CreatedAt = DateTime.UtcNow,
                InvestorProfile = new InvestorProfile
                {
                    FullName     = "Demo Investor",
                    Email        = "investor@demo.local",
                    InvestorType = "Individual"
                }
            };
            _context.Users.Add(investor);
            _logger.LogInformation("Demo Investor seeded: {Wallet}", investorWallet);
        }

        // Guarantor
        if (!string.IsNullOrEmpty(guarantorWallet) &&
            !await _context.Users.AnyAsync(u => u.WalletAddress.ToLower() == guarantorWallet))
        {
            var guarantor = new User
            {
                WalletAddress = guarantorWallet,
                Role = Role.GUARANTOR,
                IsApproved = true,
                CreatedAt = DateTime.UtcNow,
                GuarantorProfile = new GuarantorProfile
                {
                    FullName         = "Demo Guarantor",
                    Email            = "guarantor@demo.local",
                    OrganizationName = "Demo Guarantor Org"
                }
            };
            _context.Users.Add(guarantor);
            _logger.LogInformation("Demo Guarantor seeded: {Wallet}", guarantorWallet);
        }

        await _context.SaveChangesAsync();

        // Grant on-chain roles for seeded demo wallets.
        // Wrapped in try-catch — blockchain may be unavailable in local dev without a node.
        try
        {
            _logger.LogInformation("Granting on-chain roles for seeded demo wallets...");

            if (!string.IsNullOrEmpty(pmeWallet))
            {
                await _blockchainService.GrantAssetTokenRoleAsync(pmeWallet);
                await _blockchainService.GrantLoanManagerRoleAsync(pmeWallet, "PME");
            }

            if (!string.IsNullOrEmpty(investorWallet))
                await _blockchainService.GrantLoanManagerRoleAsync(investorWallet, "INVESTOR");

            _logger.LogInformation("On-chain roles granted for demo wallets.");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not grant on-chain roles during seeding — blockchain may not be available. Grant manually if needed.");
        }
    }
}
