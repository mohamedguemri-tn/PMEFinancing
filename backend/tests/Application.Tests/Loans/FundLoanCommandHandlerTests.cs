using Application.Common.Exceptions;
using Application.Loans.Commands;
using Application.Loans.Handlers;
using Application.Tests.Helpers;
using Domain.Entities;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;

namespace Application.Tests.Loans;

public class FundLoanCommandHandlerTests
{
    private static FundLoanCommandHandler CreateHandler(Infrastructure.Persistence.AppDbContext ctx)
        => new(ctx, NullLogger<FundLoanCommandHandler>.Instance);

    // ── Test 1 — Happy path ──────────────────────────────────────────────────

    [Fact]
    public async Task Handle_ValidCommand_LoanFundedAndAssetCollateral()
    {
        using var ctx = TestDbContextFactory.Create();
        var pme = new User { WalletAddress = "0xPME", Role = Role.PME };
        var investor = new User { WalletAddress = "0xINV", Role = Role.INVESTOR };
        var asset = new Asset { OwnerId = pme.Id, Name = "Asset", AssetType = "RE", EstimatedValue = 1000, Status = AssetStatus.ATO };
        ctx.Users.AddRange(pme, investor);
        ctx.Assets.Add(asset);
        await ctx.SaveChangesAsync();

        var loan = new Loan { PmeId = pme.Id, CollateralAssetId = asset.Id, RequestedAmount = 5, DurationDays = 30, Status = LoanStatus.REQUESTED };
        ctx.Loans.Add(loan);
        await ctx.SaveChangesAsync();

        await CreateHandler(ctx).Handle(
            new FundLoanCommand { Id = loan.Id, InvestorWallet = "0xINV", AmountEth = 5m, TransactionHash = "0xtx" },
            CancellationToken.None);

        var savedLoan = await ctx.Loans.FindAsync(loan.Id);
        savedLoan!.Status.Should().Be(LoanStatus.FUNDED);
        savedLoan.InvestorId.Should().Be(investor.Id);
        savedLoan.FundedAt.Should().NotBeNull();

        var savedAsset = await ctx.Assets.FindAsync(asset.Id);
        savedAsset!.Status.Should().Be(AssetStatus.COLLATERAL);
    }

    // ── Test 2 — Loan not found ──────────────────────────────────────────────

    [Fact]
    public async Task Handle_LoanNotFound_ThrowsNotFoundException()
    {
        using var ctx = TestDbContextFactory.Create();

        Func<Task> act = () => CreateHandler(ctx).Handle(
            new FundLoanCommand { Id = Guid.NewGuid(), InvestorWallet = "0x", AmountEth = 1 },
            CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
    }

    // ── Test 3 — Loan already funded ────────────────────────────────────────

    [Fact]
    public async Task Handle_LoanAlreadyFunded_ThrowsForbiddenActionException()
    {
        using var ctx = TestDbContextFactory.Create();
        var pme = new User { WalletAddress = "0xPME", Role = Role.PME };
        var asset = new Asset { OwnerId = pme.Id, Name = "A", AssetType = "RE", EstimatedValue = 100, Status = AssetStatus.COLLATERAL };
        ctx.Users.Add(pme);
        ctx.Assets.Add(asset);
        await ctx.SaveChangesAsync();

        var loan = new Loan { PmeId = pme.Id, CollateralAssetId = asset.Id, RequestedAmount = 5, DurationDays = 30, Status = LoanStatus.FUNDED };
        ctx.Loans.Add(loan);
        await ctx.SaveChangesAsync();

        Func<Task> act = () => CreateHandler(ctx).Handle(
            new FundLoanCommand { Id = loan.Id, InvestorWallet = "0xAny", AmountEth = 5 },
            CancellationToken.None);

        await act.Should().ThrowAsync<ForbiddenActionException>();
    }

    // ── Test 4 — Investor wallet not in DB ──────────────────────────────────

    [Fact]
    public async Task Handle_InvestorNotFound_ThrowsNotFoundException()
    {
        using var ctx = TestDbContextFactory.Create();
        var pme = new User { WalletAddress = "0xPME", Role = Role.PME };
        var asset = new Asset { OwnerId = pme.Id, Name = "A", AssetType = "RE", EstimatedValue = 100, Status = AssetStatus.ATO };
        ctx.Users.Add(pme);
        ctx.Assets.Add(asset);
        await ctx.SaveChangesAsync();

        var loan = new Loan { PmeId = pme.Id, CollateralAssetId = asset.Id, RequestedAmount = 5, DurationDays = 30, Status = LoanStatus.REQUESTED };
        ctx.Loans.Add(loan);
        await ctx.SaveChangesAsync();

        Func<Task> act = () => CreateHandler(ctx).Handle(
            new FundLoanCommand { Id = loan.Id, InvestorWallet = "0xDoesNotExist", AmountEth = 5 },
            CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
    }

    // ── Test 5 — Fund an already-FUNDED loan is rejected ────────────────────

    [Fact]
    public async Task Handle_LoanStatusFunded_ThrowsForbiddenActionException()
    {
        using var ctx = TestDbContextFactory.Create();
        var pme = new User { WalletAddress = "0xPME", Role = Role.PME };
        var investor = new User { WalletAddress = "0xINV", Role = Role.INVESTOR };
        var asset = new Asset { OwnerId = pme.Id, Name = "A", AssetType = "RE", EstimatedValue = 100, Status = AssetStatus.COLLATERAL };
        ctx.Users.AddRange(pme, investor);
        ctx.Assets.Add(asset);
        await ctx.SaveChangesAsync();

        var loan = new Loan { PmeId = pme.Id, CollateralAssetId = asset.Id, RequestedAmount = 5, DurationDays = 30, Status = LoanStatus.FUNDED };
        ctx.Loans.Add(loan);
        await ctx.SaveChangesAsync();

        Func<Task> act = () => CreateHandler(ctx).Handle(
            new FundLoanCommand { Id = loan.Id, InvestorWallet = "0xINV", AmountEth = 5 },
            CancellationToken.None);

        await act.Should().ThrowAsync<ForbiddenActionException>();
    }

    // ── Test 6 — Fund a REPAID loan is rejected ──────────────────────────────

    [Fact]
    public async Task Handle_LoanStatusRepaid_ThrowsForbiddenActionException()
    {
        using var ctx = TestDbContextFactory.Create();
        var pme = new User { WalletAddress = "0xPME", Role = Role.PME };
        var investor = new User { WalletAddress = "0xINV", Role = Role.INVESTOR };
        var asset = new Asset { OwnerId = pme.Id, Name = "A", AssetType = "RE", EstimatedValue = 100, Status = AssetStatus.ATO };
        ctx.Users.AddRange(pme, investor);
        ctx.Assets.Add(asset);
        await ctx.SaveChangesAsync();

        var loan = new Loan { PmeId = pme.Id, CollateralAssetId = asset.Id, RequestedAmount = 5, DurationDays = 30, Status = LoanStatus.REPAID };
        ctx.Loans.Add(loan);
        await ctx.SaveChangesAsync();

        Func<Task> act = () => CreateHandler(ctx).Handle(
            new FundLoanCommand { Id = loan.Id, InvestorWallet = "0xINV", AmountEth = 5 },
            CancellationToken.None);

        await act.Should().ThrowAsync<ForbiddenActionException>();
    }

    // ── Test 7 — TransactionHash is accepted without error ───────────────────

    [Fact]
    public async Task Handle_WithTransactionHash_Succeeds()
    {
        using var ctx = TestDbContextFactory.Create();
        var pme = new User { WalletAddress = "0xPME", Role = Role.PME };
        var investor = new User { WalletAddress = "0xINV", Role = Role.INVESTOR };
        var asset = new Asset { OwnerId = pme.Id, Name = "A", AssetType = "RE", EstimatedValue = 100, Status = AssetStatus.ATO };
        ctx.Users.AddRange(pme, investor);
        ctx.Assets.Add(asset);
        await ctx.SaveChangesAsync();

        var loan = new Loan { PmeId = pme.Id, CollateralAssetId = asset.Id, RequestedAmount = 5, DurationDays = 30, Status = LoanStatus.REQUESTED };
        ctx.Loans.Add(loan);
        await ctx.SaveChangesAsync();

        var act = () => CreateHandler(ctx).Handle(
            new FundLoanCommand { Id = loan.Id, InvestorWallet = "0xINV", AmountEth = 5, TransactionHash = "0xdeadbeef" },
            CancellationToken.None);

        await act.Should().NotThrowAsync();
    }
}
