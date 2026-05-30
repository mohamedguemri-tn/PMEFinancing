using Application.Common.Models;
using Application.Loans.Queries;
using Domain.Entities;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Loans.Handlers;

public class GetOverdueLoansQueryHandler : IRequestHandler<GetOverdueLoansQuery, PaginatedResult<OverdueLoanDto>>
{
    private readonly AppDbContext _context;

    public GetOverdueLoansQueryHandler(AppDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedResult<OverdueLoanDto>> Handle(GetOverdueLoansQuery request, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;

        var baseQuery = _context.Loans
            .Include(l => l.Pme).ThenInclude(p => p.PmeProfile)
            .Include(l => l.CollateralAsset)
            .Include(l => l.Investor)
            .Where(l => l.Status == LoanStatus.FUNDED && l.DueDate.HasValue && l.DueDate.Value < now)
            .OrderBy(l => l.DueDate);

        var totalCount = await baseQuery.CountAsync(cancellationToken);

        var loans = await baseQuery
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var items = loans.Select(l => new OverdueLoanDto
        {
            Id = l.Id,
            PmeName = l.Pme.PmeProfile?.CompanyName ?? l.Pme.WalletAddress,
            AssetName = l.CollateralAsset.Name,
            RequestedAmount = l.RequestedAmount,
            DueDate = l.DueDate!.Value,
            DaysOverdue = (int)(now - l.DueDate!.Value).TotalDays,
            InvestorWallet = l.Investor?.WalletAddress,
            OnChainLoanId = l.OnChainLoanId,
        }).ToList();

        return new PaginatedResult<OverdueLoanDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = request.Page,
            PageSize = request.PageSize
        };
    }
}
