using MediatR;

namespace Application.Auth.Commands;

public class ApproveUserCommand : IRequest<Unit>
{
    public Guid UserId { get; set; }
    public string GovernorWalletAddress { get; set; } = string.Empty;
}
