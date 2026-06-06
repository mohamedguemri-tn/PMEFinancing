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

    // ── Test 1 — Soft-deletes user with no related records ───────────────────

    [Fact]
    public async Task Handle_ValidUser_SoftDeletesUser()
    {
        using var ctx = TestDbContextFactory.Create();
        var user = new User { WalletAddress = "0xpme1", Role = Role.PME, IsApproved = true };
        ctx.Users.Add(user);
        await ctx.SaveChangesAsync();

        await CreateHandler(ctx).Handle(new DeleteUserCommand { UserId = user.Id }, CancellationToken.None);

        var result = await ctx.Users.FindAsync(user.Id);
        result.Should().NotBeNull();
        result!.IsDeleted.Should().BeTrue();
    }

    // ── Test 1b — Soft-deletes user and cascades to assets ───────────────────

    [Fact]
    public async Task Handle_UserWithAssets_SoftDeletesUserAndAssets()
    {
        using var ctx = TestDbContextFactory.Create();
        var user = new User { WalletAddress = "0xpme2", Role = Role.PME, IsApproved = true };
        ctx.Users.Add(user);
        var asset = new Asset { OwnerId = user.Id, Name = "Machine", AssetType = "Equipment", EstimatedValue = 10m, Status = AssetStatus.REGISTERED };
        ctx.Assets.Add(asset);
        await ctx.SaveChangesAsync();

        await CreateHandler(ctx).Handle(new DeleteUserCommand { UserId = user.Id }, CancellationToken.None);

        var deletedUser = await ctx.Users.FindAsync(user.Id);
        deletedUser!.IsDeleted.Should().BeTrue();

        var deletedAsset = await ctx.Assets.FindAsync(asset.Id);
        deletedAsset!.IsDeleted.Should().BeTrue();
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
