using Application.Common.Exceptions;
using Application.Loans.Commands;
using Application.Loans.Handlers;
using Application.Tests.Helpers;
using Domain.Entities;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;

namespace Application.Tests.Loans;

public class RepayLoanCommandHandlerTests
{
    private static RepayLoanCommandHandler CreateHandler(Infrastructure.Persistence.AppDbContext ctx)
        => new(ctx, NullLogger<RepayLoanCommandHandler>.Instance);

    // ── Test 1 — Happy path ──────────────────────────────────────────────────

    [Fact]
    public async Task Handle_ValidCommand_LoanRepaidAndAssetATO()
    {
        using var ctx = TestDbContextFactory.Create();
        var pme = new User { WalletAddress = "0xPME", Role = Role.PME };
        var investor = new User { WalletAddress = "0xINV", Role = Role.INVESTOR };
        var asset = new Asset { OwnerId = pme.Id, Name = "Asset", AssetType = "RE", EstimatedValue = 1000, Status = AssetStatus.COLLATERAL };
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
            FundedAt = DateTime.UtcNow.AddDays(-5),
        };
        ctx.Loans.Add(loan);
        await ctx.SaveChangesAsync();

        await CreateHandler(ctx).Handle(
            new RepayLoanCommand { Id = loan.Id, PmeWallet = "0xPME", AmountEth = 5.4m },
            CancellationToken.None);

        var savedLoan = await ctx.Loans.FindAsync(loan.Id);
        savedLoan!.Status.Should().Be(LoanStatus.REPAID);
        savedLoan.RepaidAt.Should().NotBeNull();

        var savedAsset = await ctx.Assets.FindAsync(asset.Id);
        savedAsset!.Status.Should().Be(AssetStatus.ATO);
    }

    // ── Test 2 — Loan not found ──────────────────────────────────────────────

    [Fact]
    public async Task Handle_LoanNotFound_ThrowsNotFoundException()
    {
        using var ctx = TestDbContextFactory.Create();

        Func<Task> act = () => CreateHandler(ctx).Handle(
            new RepayLoanCommand { Id = Guid.NewGuid(), PmeWallet = "0x", AmountEth = 1 },
            CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
    }

    // ── Test 3 — Loan not in FUNDED state ────────────────────────────────────

    [Fact]
    public async Task Handle_LoanNotFunded_ThrowsForbiddenActionException_WithFundedInMessage()
    {
        using var ctx = TestDbContextFactory.Create();
        var pme = new User { WalletAddress = "0xPME", Role = Role.PME };
        var asset = new Asset { OwnerId = pme.Id, Name = "A", AssetType = "RE", EstimatedValue = 100 };
        ctx.Users.Add(pme);
        ctx.Assets.Add(asset);
        await ctx.SaveChangesAsync();

        var loan = new Loan { PmeId = pme.Id, CollateralAssetId = asset.Id, RequestedAmount = 5, DurationDays = 30, Status = LoanStatus.REQUESTED };
        ctx.Loans.Add(loan);
        await ctx.SaveChangesAsync();

        Func<Task> act = () => CreateHandler(ctx).Handle(
            new RepayLoanCommand { Id = loan.Id, PmeWallet = "0xPME", AmountEth = 5 },
            CancellationToken.None);

        var assertion = await act.Should().ThrowAsync<ForbiddenActionException>();
        assertion.WithMessage("*FUNDED*");
    }

    // ── Test 4 — Wrong owner ─────────────────────────────────────────────────

    [Fact]
    public async Task Handle_WrongOwner_ThrowsForbiddenActionException()
    {
        using var ctx = TestDbContextFactory.Create();
        var pmeA = new User { WalletAddress = "0xPME_A", Role = Role.PME };
        var pmeB = new User { WalletAddress = "0xPME_B", Role = Role.PME };
        var asset = new Asset { OwnerId = pmeA.Id, Name = "A", AssetType = "RE", EstimatedValue = 100, Status = AssetStatus.COLLATERAL };
        ctx.Users.AddRange(pmeA, pmeB);
        ctx.Assets.Add(asset);
        await ctx.SaveChangesAsync();

        var loan = new Loan
        {
            PmeId = pmeA.Id,
            CollateralAssetId = asset.Id,
            RequestedAmount = 5,
            DurationDays = 30,
            Status = LoanStatus.FUNDED,
            FundedAt = DateTime.UtcNow,
        };
        ctx.Loans.Add(loan);
        await ctx.SaveChangesAsync();

        Func<Task> act = () => CreateHandler(ctx).Handle(
            new RepayLoanCommand { Id = loan.Id, PmeWallet = "0xPME_B", AmountEth = 5 },
            CancellationToken.None);

        await act.Should().ThrowAsync<ForbiddenActionException>();
    }
}
