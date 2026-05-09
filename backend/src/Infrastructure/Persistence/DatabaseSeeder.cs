namespace Infrastructure.Persistence;

using Domain.Entities;
using Microsoft.EntityFrameworkCore;
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

    public DatabaseSeeder(AppDbContext context, IConfiguration configuration, ILogger<DatabaseSeeder> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Ensures the database is created, applies migrations, and seeds demo accounts if they don't exist.
    /// </summary>
    public async Task SeedAsync()
    {
        _logger.LogInformation("Starting database migration...");
        await _context.Database.MigrateAsync();
        _logger.LogInformation("Database migration completed.");

        await SeedGovernorAsync();
        await SeedDemoUsersAsync();
    }

    private async Task SeedGovernorAsync()
    {
        if (await _context.Users.AnyAsync(u => u.Role == Role.GOVERNOR))
        {
            _logger.LogInformation("Governor account already exists. Skipping.");
            return;
        }

        var wallet = _configuration["GovernorWallet"] ?? "0x0000000000000000000000000000000000000000";
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
        var pmeWallet      = _configuration["DemoWallets:Pme"]      ?? string.Empty;
        var investorWallet = _configuration["DemoWallets:Investor"]  ?? string.Empty;
        var guarantorWallet= _configuration["DemoWallets:Guarantor"] ?? string.Empty;

        if (string.IsNullOrEmpty(pmeWallet)) return;

        // PME
        if (!await _context.Users.AnyAsync(u => u.WalletAddress == pmeWallet))
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
            !await _context.Users.AnyAsync(u => u.WalletAddress == investorWallet))
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
            !await _context.Users.AnyAsync(u => u.WalletAddress == guarantorWallet))
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
    }
}
