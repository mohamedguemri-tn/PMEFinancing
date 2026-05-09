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
    public DbSet<PmeProfile> PmeProfiles { get; set; }
    public DbSet<InvestorProfile> InvestorProfiles { get; set; }
    public DbSet<GuarantorProfile> GuarantorProfiles { get; set; }
    public DbSet<Nonce> Nonces { get; set; }
    public DbSet<BlocklistedToken> BlocklistedTokens { get; set; }
    public DbSet<Asset> Assets { get; set; }
    public DbSet<Loan> Loans { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User Configuration
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.WalletAddress).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Role).HasConversion<string>().IsRequired().HasMaxLength(20);
            entity.Property(e => e.IsApproved).IsRequired().HasDefaultValue(false);
            entity.Property(e => e.CreatedAt).IsRequired();

            // Unique index on WalletAddress
            entity.HasIndex(e => e.WalletAddress).IsUnique();

            // One-to-one relationships with cascade delete
            entity.HasOne(e => e.PmeProfile)
                .WithOne(p => p.User)
                .HasForeignKey<PmeProfile>(p => p.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.InvestorProfile)
                .WithOne(p => p.User)
                .HasForeignKey<InvestorProfile>(p => p.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.GuarantorProfile)
                .WithOne(p => p.User)
                .HasForeignKey<GuarantorProfile>(p => p.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Collections
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
        });

        // PmeProfile Configuration
        modelBuilder.Entity<PmeProfile>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.CompanyName).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Sector).IsRequired().HasMaxLength(100);
        });

        // InvestorProfile Configuration
        modelBuilder.Entity<InvestorProfile>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FullName).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
            entity.Property(e => e.InvestorType).IsRequired().HasMaxLength(100);
        });

        // GuarantorProfile Configuration
        modelBuilder.Entity<GuarantorProfile>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FullName).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
            entity.Property(e => e.OrganizationName).IsRequired().HasMaxLength(255);
        });

        // Nonce Configuration (standalone, WalletAddress indexed)
        modelBuilder.Entity<Nonce>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.WalletAddress).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Value).IsRequired();
            entity.Property(e => e.ExpiresAt).IsRequired();

            entity.HasIndex(e => e.WalletAddress);
        });

        // BlocklistedToken Configuration (Jti indexed)
        modelBuilder.Entity<BlocklistedToken>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Jti).IsRequired().HasMaxLength(255);
            entity.Property(e => e.ExpiresAt).IsRequired();

            entity.HasIndex(e => e.Jti);
        });

        // Asset Configuration
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

        // Loan Configuration
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
