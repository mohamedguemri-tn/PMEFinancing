using Application.Assets.Commands;
using Application.Assets.Handlers;
using Application.Common.Exceptions;
using Application.Tests.Helpers;
using Domain.Entities;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;

namespace Application.Tests.Assets;

public class TokenizeAssetCommandHandlerTests
{
    private static TokenizeAssetCommandHandler CreateHandler(Infrastructure.Persistence.AppDbContext ctx)
        => new(ctx, NullLogger<TokenizeAssetCommandHandler>.Instance);

    // ── Test 1 — Happy path ──────────────────────────────────────────────────

    [Fact]
    public async Task Handle_ValidCommand_ReturnsTransactionHash()
    {
        using var ctx = TestDbContextFactory.Create();
        var user = new User { WalletAddress = "0xPME" };
        var asset = new Asset { OwnerId = user.Id, Name = "Test Asset", AssetType = "REAL_ESTATE", EstimatedValue = 1000 };
        ctx.Users.Add(user);
        ctx.Assets.Add(asset);
        await ctx.SaveChangesAsync();

        var result = await CreateHandler(ctx).Handle(new TokenizeAssetCommand
        {
            Id = asset.Id,
            PmeWallet = "0xPME",
            TransactionHash = "0xabc",
            TokenId = 5,
        }, CancellationToken.None);

        result.Should().Be("0xabc");
        var saved = await ctx.Assets.FindAsync(asset.Id);
        saved!.Status.Should().Be(AssetStatus.ATO);
        saved.TokenId.Should().Be(5);
    }

    // ── Test 2 — Asset not found ─────────────────────────────────────────────

    [Fact]
    public async Task Handle_AssetNotFound_ThrowsNotFoundException()
    {
        using var ctx = TestDbContextFactory.Create();

        Func<Task> act = () => CreateHandler(ctx).Handle(new TokenizeAssetCommand
        {
            Id = Guid.NewGuid(),
            PmeWallet = "0xAny",
            TransactionHash = "0x",
            TokenId = 1,
        }, CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
    }

    // ── Test 3 — Wrong owner ─────────────────────────────────────────────────

    [Fact]
    public async Task Handle_WrongOwner_ThrowsForbiddenActionException()
    {
        using var ctx = TestDbContextFactory.Create();
        var userA = new User { WalletAddress = "0xOwner" };
        var userB = new User { WalletAddress = "0xOther" };
        var asset = new Asset { OwnerId = userA.Id, Name = "Test Asset", AssetType = "REAL_ESTATE", EstimatedValue = 1000 };
        ctx.Users.AddRange(userA, userB);
        ctx.Assets.Add(asset);
        await ctx.SaveChangesAsync();

        Func<Task> act = () => CreateHandler(ctx).Handle(new TokenizeAssetCommand
        {
            Id = asset.Id,
            PmeWallet = "0xOther",
            TransactionHash = "0x",
            TokenId = 1,
        }, CancellationToken.None);

        await act.Should().ThrowAsync<ForbiddenActionException>();
    }

    // ── Test 4 — Persists TokenId and TransactionHash ────────────────────────

    [Fact]
    public async Task Handle_ValidCommand_PersistsTokenIdAndHash()
    {
        using var ctx = TestDbContextFactory.Create();
        var user = new User { WalletAddress = "0xPME" };
        var asset = new Asset { OwnerId = user.Id, Name = "Test Asset", AssetType = "REAL_ESTATE", EstimatedValue = 1000 };
        ctx.Users.Add(user);
        ctx.Assets.Add(asset);
        await ctx.SaveChangesAsync();

        var result = await CreateHandler(ctx).Handle(new TokenizeAssetCommand
        {
            Id = asset.Id,
            PmeWallet = "0xPME",
            TransactionHash = "0xdeadbeef",
            TokenId = 42,
        }, CancellationToken.None);

        var saved = await ctx.Assets.FindAsync(asset.Id);
        saved!.TokenId.Should().Be(42);
        result.Should().Be("0xdeadbeef");
    }
}
