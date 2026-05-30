using Application.Common.Exceptions;
using Application.Loans.Commands;
using Application.Loans.Handlers;
using Application.Tests.Helpers;
using Domain.Entities;
using FluentAssertions;

namespace Application.Tests.Loans;

public class WithdrawGuaranteeCommandHandlerTests
{
    private static WithdrawGuaranteeCommandHandler CreateHandler(Infrastructure.Persistence.AppDbContext ctx)
        => new(ctx);

    // ── Test 1 — Happy path ──────────────────────────────────────────────────

    [Fact]
    public async Task Handle_ValidWithdraw_GuarantorFieldsCleared()
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
            GuaranteedAt = DateTime.UtcNow.AddMinutes(-10),
        };
        ctx.Loans.Add(loan);
        await ctx.SaveChangesAsync();

        await CreateHandler(ctx).Handle(new WithdrawGuaranteeCommand
        {
            LoanId = loan.Id,
            GuarantorWallet = "0xGUAR",
        }, CancellationToken.None);

        var saved = await ctx.Loans.FindAsync(loan.Id);
        saved!.GuarantorId.Should().BeNull();
        saved.GuarantorAssetId.Should().BeNull();
        saved.GuaranteedAt.Should().BeNull();
    }

    // ── Test 2 — Loan already funded, cannot withdraw ────────────────────────

    [Fact]
    public async Task Handle_LoanFunded_ThrowsForbiddenActionException()
    {
        using var ctx = TestDbContextFactory.Create();
        var pme = new User { WalletAddress = "0xPME", Role = Role.PME, IsApproved = true };
        var guarantor = new User { WalletAddress = "0xGUAR", Role = Role.GUARANTOR, IsApproved = true };
        var collateral = new Asset { OwnerId = pme.Id, Name = "A", AssetType = "RE", EstimatedValue = 100, Status = AssetStatus.COLLATERAL };
        ctx.Users.AddRange(pme, guarantor);
        ctx.Assets.Add(collateral);
        await ctx.SaveChangesAsync();

        var loan = new Loan
        {
            PmeId = pme.Id, CollateralAssetId = collateral.Id, RequestedAmount = 5, DurationDays = 30,
            Status = LoanStatus.FUNDED, GuarantorId = guarantor.Id,
        };
        ctx.Loans.Add(loan);
        await ctx.SaveChangesAsync();

        Func<Task> act = () => CreateHandler(ctx).Handle(new WithdrawGuaranteeCommand
        {
            LoanId = loan.Id,
            GuarantorWallet = "0xGUAR",
        }, CancellationToken.None);

        await act.Should().ThrowAsync<ForbiddenActionException>()
            .WithMessage("*REQUESTED*");
    }

    // ── Test 3 — Wrong guarantor wallet ─────────────────────────────────────

    [Fact]
    public async Task Handle_WrongGuarantorWallet_ThrowsForbiddenActionException()
    {
        using var ctx = TestDbContextFactory.Create();
        var pme = new User { WalletAddress = "0xPME", Role = Role.PME, IsApproved = true };
        var guarantor = new User { WalletAddress = "0xGUAR", Role = Role.GUARANTOR, IsApproved = true };
        var collateral = new Asset { OwnerId = pme.Id, Name = "A", AssetType = "RE", EstimatedValue = 100, Status = AssetStatus.ATO };
        ctx.Users.AddRange(pme, guarantor);
        ctx.Assets.Add(collateral);
        await ctx.SaveChangesAsync();

        var loan = new Loan
        {
            PmeId = pme.Id, CollateralAssetId = collateral.Id, RequestedAmount = 5, DurationDays = 30,
            Status = LoanStatus.REQUESTED, GuarantorId = guarantor.Id,
        };
        ctx.Loans.Add(loan);
        await ctx.SaveChangesAsync();

        Func<Task> act = () => CreateHandler(ctx).Handle(new WithdrawGuaranteeCommand
        {
            LoanId = loan.Id,
            GuarantorWallet = "0xDIFFERENT",
        }, CancellationToken.None);

        await act.Should().ThrowAsync<ForbiddenActionException>()
            .WithMessage("*not the guarantor*");
    }
}
