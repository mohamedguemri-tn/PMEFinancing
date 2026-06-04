using Application.Admin.Handlers;
using Application.Admin.Queries;
using Application.Tests.Helpers;
using Domain.Entities;
using FluentAssertions;

namespace Application.Tests.Admin;

public class GetAllUsersQueryHandlerTests
{
    private static GetAllUsersQueryHandler CreateHandler(Infrastructure.Persistence.AppDbContext ctx)
        => new(ctx);

    // ── Test 1 — No filter returns all non-deleted users ──────────────────────

    [Fact]
    public async Task Handle_NoFilter_ReturnsAllNonDeletedUsers()
    {
        using var ctx = TestDbContextFactory.Create();
        ctx.Users.AddRange(
            new User { WalletAddress = "0xpme1", Role = Role.PME, IsApproved = true },
            new User { WalletAddress = "0xinv1", Role = Role.INVESTOR, IsApproved = true },
            new User { WalletAddress = "0xdel1", Role = Role.PME, IsApproved = true, IsDeleted = true }
        );
        await ctx.SaveChangesAsync();

        var result = await CreateHandler(ctx).Handle(new GetAllUsersQuery(), CancellationToken.None);

        result.TotalCount.Should().Be(2);
        result.Items.Should().HaveCount(2);
        result.Items.Should().NotContain(u => u.WalletAddress == "0xdel1");
    }

    // ── Test 2 — Role filter returns only matching role ───────────────────────

    [Fact]
    public async Task Handle_RoleFilter_ReturnsOnlyMatchingRole()
    {
        using var ctx = TestDbContextFactory.Create();
        ctx.Users.AddRange(
            new User { WalletAddress = "0xpme1", Role = Role.PME, IsApproved = true },
            new User { WalletAddress = "0xpme2", Role = Role.PME, IsApproved = true },
            new User { WalletAddress = "0xinv1", Role = Role.INVESTOR, IsApproved = true }
        );
        await ctx.SaveChangesAsync();

        var result = await CreateHandler(ctx).Handle(
            new GetAllUsersQuery { Role = "PME" }, CancellationToken.None);

        result.TotalCount.Should().Be(2);
        result.Items.Should().AllSatisfy(u => u.Role.Should().Be("PME"));
    }

    // ── Test 3 — Search by wallet address ────────────────────────────────────

    [Fact]
    public async Task Handle_SearchByWallet_ReturnsMatchingUsers()
    {
        using var ctx = TestDbContextFactory.Create();
        ctx.Users.AddRange(
            new User { WalletAddress = "0xabc123", Role = Role.PME, IsApproved = true },
            new User { WalletAddress = "0xdef456", Role = Role.INVESTOR, IsApproved = true }
        );
        await ctx.SaveChangesAsync();

        var result = await CreateHandler(ctx).Handle(
            new GetAllUsersQuery { Search = "abc" }, CancellationToken.None);

        result.TotalCount.Should().Be(1);
        result.Items.Single().WalletAddress.Should().Be("0xabc123");
    }
}
