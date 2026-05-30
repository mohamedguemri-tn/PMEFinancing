using Application.Admin.Queries;
using Domain.Entities;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Admin.Handlers;

public class GetPlatformStatsQueryHandler : IRequestHandler<GetPlatformStatsQuery, PlatformStatsDto>
{
    private readonly AppDbContext _context;

    public GetPlatformStatsQueryHandler(AppDbContext context)
    {
        _context = context;
    }

    public async Task<PlatformStatsDto> Handle(GetPlatformStatsQuery request, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;

        var totalUsers = await _context.Users.CountAsync(u => !u.IsDeleted, cancellationToken);
        var totalPmes = await _context.Users.CountAsync(u => u.Role == Role.PME && !u.IsDeleted, cancellationToken);
        var totalInvestors = await _context.Users.CountAsync(u => u.Role == Role.INVESTOR && !u.IsDeleted, cancellationToken);
        var pendingApprovals = await _context.Users.CountAsync(u => !u.IsApproved && !u.IsDeleted, cancellationToken);
        var totalAssets = await _context.Assets.CountAsync(a => !a.IsDeleted, cancellationToken);
        var tokenizedAssets = await _context.Assets.CountAsync(a => !a.IsDeleted && a.TokenId.HasValue, cancellationToken);
        var totalLoans = await _context.Loans.CountAsync(l => !l.IsDeleted, cancellationToken);
        var activeLoans = await _context.Loans.CountAsync(l => l.Status == LoanStatus.FUNDED && !l.IsDeleted, cancellationToken);
        var overdueLoans = await _context.Loans.CountAsync(
            l => l.Status == LoanStatus.FUNDED && l.DueDate.HasValue && l.DueDate < now && !l.IsDeleted, cancellationToken);
        var repaidLoans = await _context.Loans.CountAsync(l => l.Status == LoanStatus.REPAID && !l.IsDeleted, cancellationToken);
        var liquidatedLoans = await _context.Loans.CountAsync(l => l.Status == LoanStatus.LIQUIDATED && !l.IsDeleted, cancellationToken);

        var totalFundedAmount = await _context.Loans
            .Where(l => !l.IsDeleted && l.FundedAt.HasValue)
            .SumAsync(l => (decimal?)l.RequestedAmount, cancellationToken) ?? 0m;

        var totalRepaidAmount = await _context.Loans
            .Where(l => !l.IsDeleted && l.Status == LoanStatus.REPAID)
            .SumAsync(l => (decimal?)l.RequestedAmount, cancellationToken) ?? 0m;

        return new PlatformStatsDto
        {
            TotalUsers = totalUsers,
            TotalPmes = totalPmes,
            TotalInvestors = totalInvestors,
            PendingApprovals = pendingApprovals,
            TotalAssets = totalAssets,
            TokenizedAssets = tokenizedAssets,
            TotalLoans = totalLoans,
            ActiveLoans = activeLoans,
            OverdueLoans = overdueLoans,
            RepaidLoans = repaidLoans,
            LiquidatedLoans = liquidatedLoans,
            TotalFundedAmount = totalFundedAmount,
            TotalRepaidAmount = totalRepaidAmount,
        };
    }
}
