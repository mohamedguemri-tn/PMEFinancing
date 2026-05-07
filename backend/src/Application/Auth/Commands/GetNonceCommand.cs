using MediatR;

namespace Application.Auth.Commands;

public class GetNonceCommand : IRequest<string>
{
    public string WalletAddress { get; set; } = string.Empty;
}
