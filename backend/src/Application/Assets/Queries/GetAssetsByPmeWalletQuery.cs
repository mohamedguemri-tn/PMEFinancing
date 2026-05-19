using Application.Common.Models;
using MediatR;

namespace Application.Assets.Queries;

public class GetAssetsByPmeWalletQuery : IRequest<PaginatedResult<AssetDto>>
{
    public string PmeWallet { get; set; } = string.Empty;
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}

public class AssetDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string AssetType { get; set; } = string.Empty;
    public decimal EstimatedValue { get; set; }
    public string Status { get; set; } = string.Empty;
    public long? TokenId { get; set; }
}
