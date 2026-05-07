using MediatR;

namespace Application.Assets.Commands;

public class UpdateAssetCommand : IRequest
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string AssetType { get; set; } = string.Empty;
    public decimal EstimatedValue { get; set; }
}
