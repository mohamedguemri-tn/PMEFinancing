namespace Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;
using Domain.Entities;

/// <summary>
/// Application DbContext for EF Core configuration and database operations.
/// </summary>
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<Asset> Assets { get; set; }
    public DbSet<Loan> Loans { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.WalletAddress).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Role).HasConversion<string>().IsRequired().HasMaxLength(20);
            entity.Property(e => e.IsApproved).IsRequired();
            entity.Property(e => e.CreatedAt).IsRequired();

            entity.HasMany(e => e.Assets)
                .WithOne(e => e.Owner)
                .HasForeignKey(e => e.OwnerId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.PmeLoans)
                .WithOne(e => e.Pme)
                .HasForeignKey(e => e.PmeId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.InvestorLoans)
                .WithOne(e => e.Investor)
                .HasForeignKey(e => e.InvestorId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => e.WalletAddress).IsUnique();
        });

        modelBuilder.Entity<Asset>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.OwnerId).IsRequired();
            entity.Property(e => e.Name).IsRequired().HasMaxLength(255);
            entity.Property(e => e.AssetType).IsRequired().HasMaxLength(100);
            entity.Property(e => e.EstimatedValue).HasPrecision(18, 2);
            entity.Property(e => e.Status).HasConversion<string>().IsRequired().HasMaxLength(20);
            entity.Property(e => e.TokenId);
            entity.Property(e => e.CreatedAt).IsRequired();

            entity.HasOne(e => e.Owner)
                .WithMany(u => u.Assets)
                .HasForeignKey(e => e.OwnerId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => e.OwnerId);
        });

        modelBuilder.Entity<Loan>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.PmeId).IsRequired();
            entity.Property(e => e.RequestedAmount).HasPrecision(18, 2);
            entity.Property(e => e.Status).HasConversion<string>().IsRequired().HasMaxLength(20);
            entity.Property(e => e.DurationDays).IsRequired();
            entity.Property(e => e.FundedAt);
            entity.Property(e => e.RepaidAt);
            entity.Property(e => e.CreatedAt).IsRequired();

            entity.HasOne(e => e.Pme)
                .WithMany(u => u.PmeLoans)
                .HasForeignKey(e => e.PmeId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Investor)
                .WithMany(u => u.InvestorLoans)
                .HasForeignKey(e => e.InvestorId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.CollateralAsset)
                .WithMany(a => a.Loans)
                .HasForeignKey(e => e.CollateralAssetId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => e.PmeId);
            entity.HasIndex(e => e.InvestorId);
            entity.HasIndex(e => e.CollateralAssetId);
        });
    }
}
