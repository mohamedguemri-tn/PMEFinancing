using MediatR;

namespace Application.Assets.Commands;

public class TokenizeAssetCommand : IRequest<string>
{
    public Guid Id { get; set; }
    public string TransactionHash { get; set; } = string.Empty;
    public long TokenId { get; set; }
    public string PmeWallet { get; set; } = string.Empty;
}
