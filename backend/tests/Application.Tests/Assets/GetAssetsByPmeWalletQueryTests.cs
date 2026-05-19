using Application.Assets.Handlers;
using Application.Assets.Queries;
using Application.Tests.Helpers;
using Domain.Entities;
using FluentAssertions;

namespace Application.Tests.Assets;

public class GetAssetsByPmeWalletQueryTests
{
    private static GetAssetsByPmeWalletQueryHandler CreateHandler(Infrastructure.Persistence.AppDbContext ctx)
        => new(ctx);

    // ── Test 1 — Returns correct second page ─────────────────────────────────

    [Fact]
    public async Task Handle_Page2_ReturnsCorrectSlice()
    {
        using var ctx = TestDbContextFactory.Create();
        var user = new User { WalletAddress = "0xPME" };
        ctx.Users.Add(user);
        for (int i = 0; i < 15; i++)
            ctx.Assets.Add(new Asset { OwnerId = user.Id, Name = $"Asset {i}", AssetType = "REAL_ESTATE", EstimatedValue = 1000 });
        await ctx.SaveChangesAsync();

        var result = await CreateHandler(ctx).Handle(new GetAssetsByPmeWalletQuery
        {
            PmeWallet = "0xPME",
            Page = 2,
            PageSize = 10
        }, CancellationToken.None);

        result.Items.Count.Should().Be(5);
        result.TotalCount.Should().Be(15);
        result.TotalPages.Should().Be(2);
        result.HasNextPage.Should().BeFalse();
        result.HasPreviousPage.Should().BeTrue();
    }

    // ── Test 2 — Returns first page correctly ────────────────────────────────

    [Fact]
    public async Task Handle_Page1_ReturnsFirstTen()
    {
        using var ctx = TestDbContextFactory.Create();
        var user = new User { WalletAddress = "0xPME" };
        ctx.Users.Add(user);
        for (int i = 0; i < 15; i++)
            ctx.Assets.Add(new Asset { OwnerId = user.Id, Name = $"Asset {i}", AssetType = "REAL_ESTATE", EstimatedValue = 1000 });
        await ctx.SaveChangesAsync();

        var result = await CreateHandler(ctx).Handle(new GetAssetsByPmeWalletQuery
        {
            PmeWallet = "0xPME",
            Page = 1,
            PageSize = 10
        }, CancellationToken.None);

        result.Items.Count.Should().Be(10);
        result.TotalCount.Should().Be(15);
        result.HasNextPage.Should().BeTrue();
        result.HasPreviousPage.Should().BeFalse();
    }

    // ── Test 3 — Unknown wallet returns empty result ─────────────────────────

    [Fact]
    public async Task Handle_UnknownWallet_ReturnsEmptyResult()
    {
        using var ctx = TestDbContextFactory.Create();
        var user = new User { WalletAddress = "0xPME" };
        ctx.Users.Add(user);
        ctx.Assets.Add(new Asset { OwnerId = user.Id, Name = "Asset", AssetType = "REAL_ESTATE", EstimatedValue = 1000 });
        await ctx.SaveChangesAsync();

        var result = await CreateHandler(ctx).Handle(new GetAssetsByPmeWalletQuery
        {
            PmeWallet = "0xNOBODY",
            Page = 1,
            PageSize = 10
        }, CancellationToken.None);

        result.Items.Count.Should().Be(0);
        result.TotalCount.Should().Be(0);
    }
}
