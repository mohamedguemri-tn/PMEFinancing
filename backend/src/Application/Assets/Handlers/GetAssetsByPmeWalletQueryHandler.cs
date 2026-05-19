using Application.Assets.Queries;
using Application.Common.Models;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Assets.Handlers;

public class GetAssetsByPmeWalletQueryHandler : IRequestHandler<GetAssetsByPmeWalletQuery, PaginatedResult<AssetDto>>
{
    private readonly AppDbContext _context;

    public GetAssetsByPmeWalletQueryHandler(AppDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedResult<AssetDto>> Handle(GetAssetsByPmeWalletQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Assets
            .Where(a => a.Owner.WalletAddress == request.PmeWallet && !a.IsDeleted)
            .OrderByDescending(a => a.CreatedAt);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
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

        return new PaginatedResult<AssetDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = request.Page,
            PageSize = request.PageSize
        };
    }
}
