namespace Infrastructure.Persistence;

using Domain.Entities;
using Microsoft.EntityFrameworkCore;

/// <summary>
/// Seeds initial database data.
/// </summary>
public class DatabaseSeeder
{
    private readonly AppDbContext _context;

    public DatabaseSeeder(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Ensures the database is created and seeds a default GOVERNOR user.
    /// </summary>
    public async Task SeedAsync()
    {
        await _context.Database.MigrateAsync();

        if (!await _context.Users.AnyAsync(u => u.Role == Role.GOVERNOR))
        {
            _context.Users.Add(new User
            {
                WalletAddress = string.Empty,
                Role = Role.GOVERNOR,
                IsApproved = true
            });

            await _context.SaveChangesAsync();
        }
    }
}
