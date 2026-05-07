using MediatR;

namespace Application.Auth.Commands;

public class VerifySignatureCommand : IRequest<string>
{
    public string WalletAddress { get; set; } = string.Empty;
    public string Signature { get; set; } = string.Empty;
    public string Nonce { get; set; } = string.Empty;
}
