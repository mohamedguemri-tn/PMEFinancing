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
    /// Ensures the database is created, applies migrations, and seeds a default GOVERNOR user if none exists.
    /// </summary>
    public async Task SeedAsync()
    {
        _logger.LogInformation("Starting database migration...");
        await _context.Database.MigrateAsync();
        _logger.LogInformation("Database migration completed.");

        if (!await _context.Users.AnyAsync(u => u.Role == Role.GOVERNOR))
        {
            var governorWallet = _configuration["GovernorWallet"] ?? "0x0000000000000000000000000000000000000000";
            
            _logger.LogInformation("Creating default GOVERNOR user with wallet: {Wallet}", governorWallet);

            _context.Users.Add(new User
            {
                WalletAddress = governorWallet,
                Role = Role.GOVERNOR,
                IsApproved = true,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
            _logger.LogInformation("Governor account seeded successfully.");
        }
        else
        {
            _logger.LogInformation("Governor account already exists. Skipping seeding.");
        }
    }
}
