using Application.Admin.Handlers;
using Application.Admin.Queries;
using Application.Tests.Helpers;
using Domain.Entities;
using FluentAssertions;

namespace Application.Tests.Admin;

public class GetPlatformStatsQueryHandlerTests
{
    private static GetPlatformStatsQueryHandler CreateHandler(Infrastructure.Persistence.AppDbContext ctx)
        => new(ctx);

    [Fact]
    public async Task Handle_ReturnsCorrectCounts()
    {
        using var ctx = TestDbContextFactory.Create();

        var pme1 = new User { WalletAddress = "0xPME1", Role = Role.PME, IsApproved = true };
        var pme2 = new User { WalletAddress = "0xPME2", Role = Role.PME, IsApproved = true };
        var investor = new User { WalletAddress = "0xINV1", Role = Role.INVESTOR, IsApproved = true };
        ctx.Users.AddRange(pme1, pme2, investor);
        await ctx.SaveChangesAsync();

        var asset1 = new Asset { OwnerId = pme1.Id, Name = "Asset1", AssetType = "RE", EstimatedValue = 100, Status = AssetStatus.REGISTERED };
        var asset2 = new Asset { OwnerId = pme1.Id, Name = "Asset2", AssetType = "RE", EstimatedValue = 200, Status = AssetStatus.ATO, TokenId = 1 };
        var asset3 = new Asset { OwnerId = pme2.Id, Name = "Asset3", AssetType = "RE", EstimatedValue = 150, Status = AssetStatus.REGISTERED };
        ctx.Assets.AddRange(asset1, asset2, asset3);
        await ctx.SaveChangesAsync();

        var loanFunded = new Loan { PmeId = pme1.Id, CollateralAssetId = asset2.Id, RequestedAmount = 5, DurationDays = 30, Status = LoanStatus.FUNDED, FundedAt = DateTime.UtcNow.AddDays(-5) };
        var loanRepaid = new Loan { PmeId = pme2.Id, CollateralAssetId = asset3.Id, RequestedAmount = 3, DurationDays = 30, Status = LoanStatus.REPAID, FundedAt = DateTime.UtcNow.AddDays(-10), RepaidAt = DateTime.UtcNow.AddDays(-1) };
        ctx.Loans.AddRange(loanFunded, loanRepaid);
        await ctx.SaveChangesAsync();

        var result = await CreateHandler(ctx).Handle(new GetPlatformStatsQuery(), CancellationToken.None);

        result.TotalUsers.Should().Be(3);
        result.TotalPmes.Should().Be(2);
        result.TotalInvestors.Should().Be(1);
        result.TokenizedAssets.Should().Be(1);
        result.ActiveLoans.Should().Be(1);
        result.RepaidLoans.Should().Be(1);
    }
}
