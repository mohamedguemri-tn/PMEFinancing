using MediatR;

namespace Application.Admin.Commands;

public class DeleteUserCommand : IRequest<Unit>
{
    public Guid UserId { get; set; }
}
