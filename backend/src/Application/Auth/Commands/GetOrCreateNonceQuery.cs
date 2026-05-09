using MediatR;

namespace Application.Auth.Commands;

public class GetOrCreateNonceQuery : IRequest<string>
{
    public string WalletAddress { get; set; } = string.Empty;
}
