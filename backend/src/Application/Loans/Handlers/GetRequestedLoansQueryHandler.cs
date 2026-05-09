using Application.Loans.Queries;
using Domain.Entities;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Loans.Handlers;

public class GetRequestedLoansQueryHandler : IRequestHandler<GetRequestedLoansQuery, List<LoanDto>>
{
    private readonly AppDbContext _context;

    public GetRequestedLoansQueryHandler(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<LoanDto>> Handle(GetRequestedLoansQuery request, CancellationToken cancellationToken)
    {
        var loans = await _context.Loans
            .Where(l => l.Status == LoanStatus.REQUESTED)
            .Include(l => l.Pme).ThenInclude(p => p.PmeProfile)
            .Include(l => l.CollateralAsset)
            .ToListAsync(cancellationToken);

        return loans.Select(l =>
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
            };
        }).ToList();
    }
}
