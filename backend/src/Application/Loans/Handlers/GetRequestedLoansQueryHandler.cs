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
        return await _context.Loans
            .Where(l => l.Status == LoanStatus.REQUESTED)
            .Select(l => new LoanDto
            {
                Id = l.Id,
                PmeId = l.PmeId,
                PmeWallet = l.Pme.WalletAddress,
                CollateralAssetId = l.CollateralAssetId,
                AssetName = l.CollateralAsset.Name,
                RequestedAmount = l.RequestedAmount,
                DurationDays = l.DurationDays
            })
            .ToListAsync(cancellationToken);
    }
}
