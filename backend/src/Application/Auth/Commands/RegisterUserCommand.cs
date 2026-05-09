using MediatR;

namespace Application.Auth.Commands;

public class RegisterUserCommand : IRequest<Guid>
{
    public string WalletAddress { get; set; } = string.Empty;
    public string Signature { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public Dictionary<string, string> ProfileData { get; set; } = new();
}
