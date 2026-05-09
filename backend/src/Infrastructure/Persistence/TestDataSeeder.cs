using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Persistence;

public class TestDataSeeder
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<TestDataSeeder> _logger;

    public TestDataSeeder(AppDbContext context, IConfiguration configuration, ILogger<TestDataSeeder> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SeedAsync()
    {
        var governorWallet = _configuration["TestWallets:Governor"];
        var pmeWallet = _configuration["TestWallets:Pme"];
        var investorWallet = _configuration["TestWallets:Investor"];
        var guarantorWallet = _configuration["TestWallets:Guarantor"];

        if (string.IsNullOrEmpty(governorWallet) || string.IsNullOrEmpty(pmeWallet) || 
            string.IsNullOrEmpty(investorWallet) || string.IsNullOrEmpty(guarantorWallet))
        {
            _logger.LogWarning("Test wallets not fully configured in appsettings. Development skipping seeding.");
            return;
        }

        var allExist = await _context.Users.AnyAsync(u => u.WalletAddress == governorWallet) &&
                       await _context.Users.AnyAsync(u => u.WalletAddress == pmeWallet) &&
                       await _context.Users.AnyAsync(u => u.WalletAddress == investorWallet) &&
                       await _context.Users.AnyAsync(u => u.WalletAddress == guarantorWallet);

        if (allExist)
        {
            _logger.LogInformation("Seed already applied — skipping");
            return;
        }

        // 1. GOVERNOR account
        if (!await _context.Users.AnyAsync(u => u.WalletAddress == governorWallet))
        {
            _context.Users.Add(new User
            {
                WalletAddress = governorWallet,
                Role = Role.GOVERNOR,
                IsApproved = true
            });
            _logger.LogInformation("Seeded GOVERNOR account: {Wallet}", governorWallet);
        }

        // 2. PME account
        User? pmeUser = await _context.Users.FirstOrDefaultAsync(u => u.WalletAddress == pmeWallet);
        if (pmeUser == null)
        {
            pmeUser = new User
            {
                WalletAddress = pmeWallet,
                Role = Role.PME,
                IsApproved = true,
                PmeProfile = new PmeProfile
                {
                    CompanyName = "Acme SARL",
                    Email = "contact@acme.tn",
                    Sector = "Manufacturing"
                }
            };

            // Assets for PME
            var asset1 = new Asset { Name = "Machine CNC A4", AssetType = "Equipment", EstimatedValue = 12000, Status = AssetStatus.REGISTERED };
            var asset2 = new Asset { Name = "Entrepôt Tunis Nord", AssetType = "RealEstate", EstimatedValue = 45000, Status = AssetStatus.ATO, TokenId = 1 };
            var asset3 = new Asset { Name = "Brevet Process X", AssetType = "Patent", EstimatedValue = 8000, Status = AssetStatus.COLLATERAL, TokenId = 2 };

            pmeUser.Assets.Add(asset1);
            pmeUser.Assets.Add(asset2);
            pmeUser.Assets.Add(asset3);

            _context.Users.Add(pmeUser);
            _logger.LogInformation("Seeded PME account: {Wallet}", pmeWallet);

            // 5. Insert 1 test loan (using asset3 as collateral)
            _context.Loans.Add(new Loan
            {
                Pme = pmeUser,
                CollateralAsset = asset3,
                RequestedAmount = 5000,
                Status = LoanStatus.REQUESTED,
                DurationDays = 90,
                CreatedAt = DateTime.UtcNow
            });
            _logger.LogInformation("Seeded test loan for PME: {Wallet}", pmeWallet);
        }

        // 3. INVESTOR account
        if (!await _context.Users.AnyAsync(u => u.WalletAddress == investorWallet))
        {
            _context.Users.Add(new User
            {
                WalletAddress = investorWallet,
                Role = Role.INVESTOR,
                IsApproved = true,
                InvestorProfile = new InvestorProfile
                {
                    FullName = "Jean Bensalem",
                    Email = "jean@invest.tn",
                    InvestorType = "Individual"
                }
            });
            _logger.LogInformation("Seeded INVESTOR account: {Wallet}", investorWallet);
        }

        // 4. GUARANTOR account
        if (!await _context.Users.AnyAsync(u => u.WalletAddress == guarantorWallet))
        {
            var guarantorUser = new User
            {
                WalletAddress = guarantorWallet,
                Role = Role.GUARANTOR,
                IsApproved = true,
                GuarantorProfile = new GuarantorProfile
                {
                    FullName = "Sara Mrad",
                    Email = "sara@garantie.tn",
                    OrganizationName = "Garantie Pro TN"
                }
            };

            // Assets for Guarantor
            guarantorUser.Assets.Add(new Asset { Name = "Véhicule Utilitaire K9", AssetType = "Vehicle", EstimatedValue = 18000, Status = AssetStatus.REGISTERED });
            guarantorUser.Assets.Add(new Asset { Name = "Local Commercial Lac 2", AssetType = "RealEstate", EstimatedValue = 60000, Status = AssetStatus.REGISTERED });

            _context.Users.Add(guarantorUser);
            _logger.LogInformation("Seeded GUARANTOR account: {Wallet}", guarantorWallet);
        }

        await _context.SaveChangesAsync();
    }
}
