using MediatR;

namespace Application.Assets.Queries;

public class GetAssetsByPmeWalletQuery : IRequest<List<AssetDto>>
{
    public string PmeWallet { get; set; } = string.Empty;
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
