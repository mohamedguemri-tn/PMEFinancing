using Application.Common.Models;
using Application.Loans.Queries;
using Domain.Entities;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Loans.Handlers;

public class GetRequestedLoansQueryHandler : IRequestHandler<GetRequestedLoansQuery, PaginatedResult<LoanDto>>
{
    private readonly AppDbContext _context;

    public GetRequestedLoansQueryHandler(AppDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedResult<LoanDto>> Handle(GetRequestedLoansQuery request, CancellationToken cancellationToken)
    {
        var baseQuery = _context.Loans
            .Include(l => l.Pme).ThenInclude(p => p.PmeProfile)
            .Include(l => l.CollateralAsset)
            .Include(l => l.Guarantor)
            .Include(l => l.GuarantorAsset)
            .AsQueryable();

        // PME view: filter by wallet, all statuses.
        // Marketplace view: no wallet filter, only REQUESTED status.
        if (!string.IsNullOrWhiteSpace(request.PmeWallet))
            baseQuery = baseQuery.Where(l => l.Pme.WalletAddress.ToLower() == request.PmeWallet.ToLower());
        else
            baseQuery = baseQuery.Where(l => l.Status == LoanStatus.REQUESTED);

        baseQuery = baseQuery.OrderByDescending(l => l.CreatedAt);

        var totalCount = await baseQuery.CountAsync(cancellationToken);

        var loans = await baseQuery
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var items = loans.Select(l =>
        {
            var ltv = l.CollateralAsset.EstimatedValue > 0
                ? Math.Round(l.RequestedAmount / l.CollateralAsset.EstimatedValue * 100, 1)
                : 0m;

            var risk = ltv < 70 ? "LOW" : ltv > 85 ? "HIGH" : "SHORT";

            return new LoanDto
            {
                Id = l.Id,
                PmeId = l.PmeId,
                PmeWallet = l.Pme.WalletAddress,
                SmeName = l.Pme.PmeProfile?.CompanyName ?? (l.Pme.WalletAddress.Length > 8 ? l.Pme.WalletAddress[..8] + "..." : l.Pme.WalletAddress),
                CollateralAssetId = l.CollateralAssetId,
                AssetName = l.CollateralAsset.Name,
                CollateralType = l.CollateralAsset.AssetType,
                CollateralValue = l.CollateralAsset.EstimatedValue,
                RequestedAmount = l.RequestedAmount,
                DurationDays = l.DurationDays,
                LoanToValue = ltv,
                Status = l.Status.ToString(),
                RiskProfile = risk,
                OnChainLoanId = l.OnChainLoanId,
                DueDate = l.DueDate,
                GuarantorId = l.GuarantorId,
                GuarantorWallet = l.Guarantor?.WalletAddress,
                GuarantorAssetName = l.GuarantorAsset?.Name,
                GuarantorAssetValue = l.GuarantorAsset?.EstimatedValue,
            };
        }).ToList();

        return new PaginatedResult<LoanDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = request.Page,
            PageSize = request.PageSize
        };
    }
}
