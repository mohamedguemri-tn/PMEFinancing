using Application.Admin.Commands;
using Application.Admin.Handlers;
using Application.Common.Exceptions;
using Application.Tests.Helpers;
using Domain.Entities;
using FluentAssertions;

namespace Application.Tests.Admin;

public class DeleteUserCommandHandlerTests
{
    private static DeleteUserCommandHandler CreateHandler(Infrastructure.Persistence.AppDbContext ctx)
        => new(ctx);

    // ── Test 1 — Soft-deletes user successfully ───────────────────────────────

    [Fact]
    public async Task Handle_ValidUser_SetsIsDeletedTrue()
    {
        using var ctx = TestDbContextFactory.Create();
        var user = new User { WalletAddress = "0xpme1", Role = Role.PME, IsApproved = true };
        ctx.Users.Add(user);
        await ctx.SaveChangesAsync();

        await CreateHandler(ctx).Handle(new DeleteUserCommand { UserId = user.Id }, CancellationToken.None);

        var saved = await ctx.Users.FindAsync(user.Id);
        saved!.IsDeleted.Should().BeTrue();
    }

    // ── Test 2 — Governor cannot be deleted ──────────────────────────────────

    [Fact]
    public async Task Handle_GovernorUser_ThrowsForbiddenActionException()
    {
        using var ctx = TestDbContextFactory.Create();
        var governor = new User { WalletAddress = "0xgov", Role = Role.GOVERNOR, IsApproved = true };
        ctx.Users.Add(governor);
        await ctx.SaveChangesAsync();

        Func<Task> act = () => CreateHandler(ctx).Handle(
            new DeleteUserCommand { UserId = governor.Id }, CancellationToken.None);

        await act.Should().ThrowAsync<ForbiddenActionException>()
            .WithMessage("*Cannot delete Governor*");
    }

    // ── Test 3 — User not found throws NotFoundException ─────────────────────

    [Fact]
    public async Task Handle_UserNotFound_ThrowsNotFoundException()
    {
        using var ctx = TestDbContextFactory.Create();

        Func<Task> act = () => CreateHandler(ctx).Handle(
            new DeleteUserCommand { UserId = Guid.NewGuid() }, CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
    }
}
