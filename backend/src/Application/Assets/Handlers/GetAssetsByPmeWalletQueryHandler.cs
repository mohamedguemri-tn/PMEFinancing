using Application.Assets.Queries;
using Domain.Entities;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Assets.Handlers;

public class GetAssetsByPmeWalletQueryHandler : IRequestHandler<GetAssetsByPmeWalletQuery, List<AssetDto>>
{
    private readonly AppDbContext _context;

    public GetAssetsByPmeWalletQueryHandler(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<AssetDto>> Handle(GetAssetsByPmeWalletQuery request, CancellationToken cancellationToken)
    {
        return await _context.Assets
            .Where(a => a.Owner.WalletAddress == request.PmeWallet)
            .Select(a => new AssetDto
            {
                Id = a.Id,
                Name = a.Name,
                AssetType = a.AssetType,
                EstimatedValue = a.EstimatedValue,
                Status = a.Status.ToString(),
                TokenId = a.TokenId
            })
            .ToListAsync(cancellationToken);
    }
}
