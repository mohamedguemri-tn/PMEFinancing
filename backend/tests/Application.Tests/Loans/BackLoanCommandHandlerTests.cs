using Application.Common.Exceptions;
using Application.Loans.Commands;
using Application.Loans.Handlers;
using Application.Tests.Helpers;
using Domain.Entities;
using FluentAssertions;

namespace Application.Tests.Loans;

public class BackLoanCommandHandlerTests
{
    private static BackLoanCommandHandler CreateHandler(Infrastructure.Persistence.AppDbContext ctx)
        => new(ctx);

    // ── Test 1 — Happy path ──────────────────────────────────────────────────

    [Fact]
    public async Task Handle_ValidCommand_GuarantorFieldsSet()
    {
        using var ctx = TestDbContextFactory.Create();
        var pme = new User { WalletAddress = "0xPME", Role = Role.PME, IsApproved = true };
        var guarantor = new User { WalletAddress = "0xGUAR", Role = Role.GUARANTOR, IsApproved = true };
        var collateral = new Asset { OwnerId = pme.Id, Name = "PME Asset", AssetType = "RE", EstimatedValue = 100, Status = AssetStatus.ATO };
        var gAsset = new Asset { OwnerId = guarantor.Id, Name = "Guar Asset", AssetType = "RE", EstimatedValue = 50, Status = AssetStatus.REGISTERED };
        ctx.Users.AddRange(pme, guarantor);
        ctx.Assets.AddRange(collateral, gAsset);
        await ctx.SaveChangesAsync();

        var loan = new Loan { PmeId = pme.Id, CollateralAssetId = collateral.Id, RequestedAmount = 5, DurationDays = 30, Status = LoanStatus.REQUESTED };
        ctx.Loans.Add(loan);
        await ctx.SaveChangesAsync();

        await CreateHandler(ctx).Handle(new BackLoanCommand
        {
            LoanId = loan.Id,
            GuarantorAssetId = gAsset.Id,
            GuarantorWallet = "0xGUAR",
        }, CancellationToken.None);

        var saved = await ctx.Loans.FindAsync(loan.Id);
        saved!.GuarantorId.Should().Be(guarantor.Id);
        saved.GuarantorAssetId.Should().Be(gAsset.Id);
        saved.GuaranteedAt.Should().NotBeNull();
    }

    // ── Test 2 — Loan not found ──────────────────────────────────────────────

    [Fact]
    public async Task Handle_LoanNotFound_ThrowsNotFoundException()
    {
        using var ctx = TestDbContextFactory.Create();

        Func<Task> act = () => CreateHandler(ctx).Handle(new BackLoanCommand
        {
            LoanId = Guid.NewGuid(),
            GuarantorAssetId = Guid.NewGuid(),
            GuarantorWallet = "0xGUAR",
        }, CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
    }

    // ── Test 3 — Loan already funded ────────────────────────────────────────

    [Fact]
    public async Task Handle_LoanAlreadyFunded_ThrowsForbiddenActionException()
    {
        using var ctx = TestDbContextFactory.Create();
        var pme = new User { WalletAddress = "0xPME", Role = Role.PME, IsApproved = true };
        var collateral = new Asset { OwnerId = pme.Id, Name = "A", AssetType = "RE", EstimatedValue = 100, Status = AssetStatus.COLLATERAL };
        ctx.Users.Add(pme);
        ctx.Assets.Add(collateral);
        await ctx.SaveChangesAsync();

        var loan = new Loan { PmeId = pme.Id, CollateralAssetId = collateral.Id, RequestedAmount = 5, DurationDays = 30, Status = LoanStatus.FUNDED };
        ctx.Loans.Add(loan);
        await ctx.SaveChangesAsync();

        Func<Task> act = () => CreateHandler(ctx).Handle(new BackLoanCommand
        {
            LoanId = loan.Id,
            GuarantorAssetId = Guid.NewGuid(),
            GuarantorWallet = "0xGUAR",
        }, CancellationToken.None);

        await act.Should().ThrowAsync<ForbiddenActionException>()
            .WithMessage("*not open for backing*");
    }

    // ── Test 4 — Loan already has a guarantor ───────────────────────────────

    [Fact]
    public async Task Handle_LoanAlreadyHasGuarantor_ThrowsForbiddenActionException()
    {
        using var ctx = TestDbContextFactory.Create();
        var pme = new User { WalletAddress = "0xPME", Role = Role.PME, IsApproved = true };
        var guarantor = new User { WalletAddress = "0xGUAR", Role = Role.GUARANTOR, IsApproved = true };
        var collateral = new Asset { OwnerId = pme.Id, Name = "A", AssetType = "RE", EstimatedValue = 100, Status = AssetStatus.ATO };
        var gAsset = new Asset { OwnerId = guarantor.Id, Name = "G", AssetType = "RE", EstimatedValue = 50, Status = AssetStatus.REGISTERED };
        ctx.Users.AddRange(pme, guarantor);
        ctx.Assets.AddRange(collateral, gAsset);
        await ctx.SaveChangesAsync();

        var loan = new Loan
        {
            PmeId = pme.Id, CollateralAssetId = collateral.Id, RequestedAmount = 5, DurationDays = 30,
            Status = LoanStatus.REQUESTED, GuarantorId = guarantor.Id, GuarantorAssetId = gAsset.Id,
        };
        ctx.Loans.Add(loan);
        await ctx.SaveChangesAsync();

        Func<Task> act = () => CreateHandler(ctx).Handle(new BackLoanCommand
        {
            LoanId = loan.Id,
            GuarantorAssetId = gAsset.Id,
            GuarantorWallet = "0xGUAR",
        }, CancellationToken.None);

        await act.Should().ThrowAsync<ForbiddenActionException>()
            .WithMessage("*already has a guarantor*");
    }

    // ── Test 5 — Guarantor asset not owned by guarantor ─────────────────────

    [Fact]
    public async Task Handle_AssetNotOwnedByGuarantor_ThrowsForbiddenActionException()
    {
        using var ctx = TestDbContextFactory.Create();
        var pme = new User { WalletAddress = "0xPME", Role = Role.PME, IsApproved = true };
        var guarantor = new User { WalletAddress = "0xGUAR", Role = Role.GUARANTOR, IsApproved = true };
        var collateral = new Asset { OwnerId = pme.Id, Name = "A", AssetType = "RE", EstimatedValue = 100, Status = AssetStatus.ATO };
        var pmeAsset = new Asset { OwnerId = pme.Id, Name = "PME's asset", AssetType = "RE", EstimatedValue = 50, Status = AssetStatus.REGISTERED };
        ctx.Users.AddRange(pme, guarantor);
        ctx.Assets.AddRange(collateral, pmeAsset);
        await ctx.SaveChangesAsync();

        var loan = new Loan { PmeId = pme.Id, CollateralAssetId = collateral.Id, RequestedAmount = 5, DurationDays = 30, Status = LoanStatus.REQUESTED };
        ctx.Loans.Add(loan);
        await ctx.SaveChangesAsync();

        Func<Task> act = () => CreateHandler(ctx).Handle(new BackLoanCommand
        {
            LoanId = loan.Id,
            GuarantorAssetId = pmeAsset.Id,
            GuarantorWallet = "0xGUAR",
        }, CancellationToken.None);

        await act.Should().ThrowAsync<ForbiddenActionException>()
            .WithMessage("*does not belong*");
    }
}
