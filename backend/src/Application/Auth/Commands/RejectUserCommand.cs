using MediatR;

namespace Application.Auth.Commands;

public class RejectUserCommand : IRequest<Unit>
{
    public Guid UserId { get; set; }
    public string Reason { get; set; } = string.Empty;
}
