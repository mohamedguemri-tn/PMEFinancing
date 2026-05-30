using Application.Common.Exceptions;
using Application.Loans.Commands;
using Application.Loans.Handlers;
using Application.Tests.Helpers;
using Domain.Entities;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;

namespace Application.Tests.Loans;

public class LiquidateLoanCommandHandlerTests
{
    private static LiquidateLoanCommandHandler CreateHandler(Infrastructure.Persistence.AppDbContext ctx)
        => new(ctx, NullLogger<LiquidateLoanCommandHandler>.Instance);

    // ── Test 1 — Happy path ──────────────────────────────────────────────────

    [Fact]
    public async Task Handle_OverdueFundedLoan_SetsLiquidatedStatusAndAssetLiquidated()
    {
        using var ctx = TestDbContextFactory.Create();
        var pme = new User { WalletAddress = "0xPME", Role = Role.PME };
        var investor = new User { WalletAddress = "0xINV", Role = Role.INVESTOR };
        var asset = new Asset { OwnerId = pme.Id, Name = "Asset", AssetType = "RE", EstimatedValue = 100, Status = AssetStatus.COLLATERAL };
        ctx.Users.AddRange(pme, investor);
        ctx.Assets.Add(asset);
        await ctx.SaveChangesAsync();

        var loan = new Loan
        {
            PmeId = pme.Id,
            InvestorId = investor.Id,
            CollateralAssetId = asset.Id,
            RequestedAmount = 5,
            DurationDays = 30,
            Status = LoanStatus.FUNDED,
            DueDate = DateTime.UtcNow.AddDays(-1),
        };
        ctx.Loans.Add(loan);
        await ctx.SaveChangesAsync();

        await CreateHandler(ctx).Handle(
            new LiquidateLoanCommand { Id = loan.Id, TransactionHash = "0xtx" },
            CancellationToken.None);

        var savedLoan = await ctx.Loans.FindAsync(loan.Id);
        savedLoan!.Status.Should().Be(LoanStatus.LIQUIDATED);

        var savedAsset = await ctx.Assets.FindAsync(asset.Id);
        savedAsset!.Status.Should().Be(AssetStatus.LIQUIDATED);
    }

    // ── Test 2 — Loan not found ──────────────────────────────────────────────

    [Fact]
    public async Task Handle_LoanNotFound_ThrowsNotFoundException()
    {
        using var ctx = TestDbContextFactory.Create();

        Func<Task> act = () => CreateHandler(ctx).Handle(
            new LiquidateLoanCommand { Id = Guid.NewGuid(), TransactionHash = "0x" },
            CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
    }

    // ── Test 3 — Loan not FUNDED ─────────────────────────────────────────────

    [Fact]
    public async Task Handle_LoanNotFunded_ThrowsForbiddenActionException()
    {
        using var ctx = TestDbContextFactory.Create();
        var pme = new User { WalletAddress = "0xPME", Role = Role.PME };
        var asset = new Asset { OwnerId = pme.Id, Name = "A", AssetType = "RE", EstimatedValue = 100, Status = AssetStatus.COLLATERAL };
        ctx.Users.Add(pme);
        ctx.Assets.Add(asset);
        await ctx.SaveChangesAsync();

        var loan = new Loan
        {
            PmeId = pme.Id,
            CollateralAssetId = asset.Id,
            RequestedAmount = 5,
            DurationDays = 30,
            Status = LoanStatus.REPAID,
            DueDate = DateTime.UtcNow.AddDays(-1),
        };
        ctx.Loans.Add(loan);
        await ctx.SaveChangesAsync();

        Func<Task> act = () => CreateHandler(ctx).Handle(
            new LiquidateLoanCommand { Id = loan.Id, TransactionHash = "0x" },
            CancellationToken.None);

        await act.Should().ThrowAsync<ForbiddenActionException>()
            .WithMessage("*FUNDED*");
    }

    // ── Test 4 — Loan not yet overdue ────────────────────────────────────────

    [Fact]
    public async Task Handle_LoanNotYetOverdue_ThrowsForbiddenActionException()
    {
        using var ctx = TestDbContextFactory.Create();
        var pme = new User { WalletAddress = "0xPME", Role = Role.PME };
        var investor = new User { WalletAddress = "0xINV", Role = Role.INVESTOR };
        var asset = new Asset { OwnerId = pme.Id, Name = "A", AssetType = "RE", EstimatedValue = 100, Status = AssetStatus.COLLATERAL };
        ctx.Users.AddRange(pme, investor);
        ctx.Assets.Add(asset);
        await ctx.SaveChangesAsync();

        var loan = new Loan
        {
            PmeId = pme.Id,
            InvestorId = investor.Id,
            CollateralAssetId = asset.Id,
            RequestedAmount = 5,
            DurationDays = 30,
            Status = LoanStatus.FUNDED,
            DueDate = DateTime.UtcNow.AddDays(10),
        };
        ctx.Loans.Add(loan);
        await ctx.SaveChangesAsync();

        Func<Task> act = () => CreateHandler(ctx).Handle(
            new LiquidateLoanCommand { Id = loan.Id, TransactionHash = "0x" },
            CancellationToken.None);

        await act.Should().ThrowAsync<ForbiddenActionException>()
            .WithMessage("*overdue*");
    }

    // ── Test 5 — LiquidatedAt is set ─────────────────────────────────────────

    [Fact]
    public async Task Handle_SuccessfulLiquidation_LiquidatedAtIsSet()
    {
        using var ctx = TestDbContextFactory.Create();
        var pme = new User { WalletAddress = "0xPME", Role = Role.PME };
        var investor = new User { WalletAddress = "0xINV", Role = Role.INVESTOR };
        var asset = new Asset { OwnerId = pme.Id, Name = "A", AssetType = "RE", EstimatedValue = 100, Status = AssetStatus.COLLATERAL };
        ctx.Users.AddRange(pme, investor);
        ctx.Assets.Add(asset);
        await ctx.SaveChangesAsync();

        var loan = new Loan
        {
            PmeId = pme.Id,
            InvestorId = investor.Id,
            CollateralAssetId = asset.Id,
            RequestedAmount = 5,
            DurationDays = 30,
            Status = LoanStatus.FUNDED,
            DueDate = DateTime.UtcNow.AddDays(-2),
        };
        ctx.Loans.Add(loan);
        await ctx.SaveChangesAsync();

        await CreateHandler(ctx).Handle(
            new LiquidateLoanCommand { Id = loan.Id, TransactionHash = "0xdeadbeef" },
            CancellationToken.None);

        var savedLoan = await ctx.Loans.FindAsync(loan.Id);
        savedLoan!.LiquidatedAt.Should().NotBeNull();
        savedLoan.LiquidatedAt!.Value.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }
}
