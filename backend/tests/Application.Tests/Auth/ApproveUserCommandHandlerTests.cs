using Application.Auth.Commands;
using Application.Auth.Handlers;
using Application.Common.Exceptions;
using Application.Tests.Helpers;
using Domain.Entities;
using FluentAssertions;
using Infrastructure.Blockchain;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Application.Tests.Auth;

public class ApproveUserCommandHandlerTests
{
    private static ApproveUserCommandHandler CreateHandler(
        Infrastructure.Persistence.AppDbContext ctx,
        IBlockchainService blockchain)
        => new(ctx, blockchain, NullLogger<ApproveUserCommandHandler>.Instance);

    // ── Test 1 — Happy path: IsApproved becomes true ─────────────────────────

    [Fact]
    public async Task Handle_ValidPmeUser_SetsIsApprovedTrue()
    {
        using var ctx = TestDbContextFactory.Create();
        var user = new User { WalletAddress = "0xPME", Role = Role.PME, IsApproved = false };
        ctx.Users.Add(user);
        await ctx.SaveChangesAsync();

        var mock = new Mock<IBlockchainService>();
        mock.Setup(b => b.RegisterUserAsync(It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync("0xtx1");
        mock.Setup(b => b.GrantAssetTokenRoleAsync(It.IsAny<string>())).Returns(Task.CompletedTask);

        await CreateHandler(ctx, mock.Object).Handle(
            new ApproveUserCommand { UserId = user.Id }, CancellationToken.None);

        var saved = await ctx.Users.FindAsync(user.Id);
        saved!.IsApproved.Should().BeTrue();
    }

    // ── Test 2 — GrantAssetTokenRole called once for PME ────────────────────

    [Fact]
    public async Task Handle_PmeUser_CallsGrantAssetTokenRoleOnce()
    {
        using var ctx = TestDbContextFactory.Create();
        var user = new User { WalletAddress = "0xPME", Role = Role.PME, IsApproved = false };
        ctx.Users.Add(user);
        await ctx.SaveChangesAsync();

        var mock = new Mock<IBlockchainService>();
        mock.Setup(b => b.RegisterUserAsync(It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync("0xtx");
        mock.Setup(b => b.GrantAssetTokenRoleAsync(It.IsAny<string>())).Returns(Task.CompletedTask);

        await CreateHandler(ctx, mock.Object).Handle(
            new ApproveUserCommand { UserId = user.Id }, CancellationToken.None);

        mock.Verify(b => b.GrantAssetTokenRoleAsync(user.WalletAddress), Times.Once);
    }

    // ── Test 3 — GrantAssetTokenRole NOT called for Investor ────────────────

    [Fact]
    public async Task Handle_InvestorUser_DoesNotCallGrantAssetTokenRole()
    {
        using var ctx = TestDbContextFactory.Create();
        var user = new User { WalletAddress = "0xINV", Role = Role.INVESTOR, IsApproved = false };
        ctx.Users.Add(user);
        await ctx.SaveChangesAsync();

        var mock = new Mock<IBlockchainService>();
        mock.Setup(b => b.RegisterUserAsync(It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync("0xtx");

        await CreateHandler(ctx, mock.Object).Handle(
            new ApproveUserCommand { UserId = user.Id }, CancellationToken.None);

        mock.Verify(b => b.GrantAssetTokenRoleAsync(It.IsAny<string>()), Times.Never);
    }

    // ── Test 4 — GrantAssetTokenRole NOT called for Guarantor ───────────────

    [Fact]
    public async Task Handle_GuarantorUser_DoesNotCallGrantAssetTokenRole()
    {
        using var ctx = TestDbContextFactory.Create();
        var user = new User { WalletAddress = "0xGUA", Role = Role.GUARANTOR, IsApproved = false };
        ctx.Users.Add(user);
        await ctx.SaveChangesAsync();

        var mock = new Mock<IBlockchainService>();
        mock.Setup(b => b.RegisterUserAsync(It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync("0xtx");

        await CreateHandler(ctx, mock.Object).Handle(
            new ApproveUserCommand { UserId = user.Id }, CancellationToken.None);

        mock.Verify(b => b.GrantAssetTokenRoleAsync(It.IsAny<string>()), Times.Never);
    }

    // ── Test 5 — Blockchain failure does not prevent DB approval ────────────

    [Fact]
    public async Task Handle_BlockchainFailure_DoesNotPreventDbApproval()
    {
        using var ctx = TestDbContextFactory.Create();
        var user = new User { WalletAddress = "0xPME", Role = Role.PME, IsApproved = false };
        ctx.Users.Add(user);
        await ctx.SaveChangesAsync();

        var mock = new Mock<IBlockchainService>();
        mock.Setup(b => b.RegisterUserAsync(It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync("0xtx");
        mock.Setup(b => b.GrantAssetTokenRoleAsync(It.IsAny<string>()))
            .ThrowsAsync(new BlockchainException("Simulated failure"));

        await CreateHandler(ctx, mock.Object).Handle(
            new ApproveUserCommand { UserId = user.Id }, CancellationToken.None);

        var saved = await ctx.Users.FindAsync(user.Id);
        saved!.IsApproved.Should().BeTrue();
    }

    // ── Test 6 — User not found throws NotFoundException ────────────────────

    [Fact]
    public async Task Handle_UserNotFound_ThrowsNotFoundException()
    {
        using var ctx = TestDbContextFactory.Create();
        var mock = new Mock<IBlockchainService>();

        Func<Task> act = () => CreateHandler(ctx, mock.Object).Handle(
            new ApproveUserCommand { UserId = Guid.NewGuid() }, CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
    }
}
