using MediatR;

namespace Application.Assets.Commands;

public class CreateAssetCommand : IRequest<Guid>
{
    public string Name { get; set; } = string.Empty;
    public string AssetType { get; set; } = string.Empty;
    public decimal EstimatedValue { get; set; }
    public string PmeWallet { get; set; } = string.Empty;
}
