using MediatR;

namespace Application.Auth.Commands;

public class LogoutCommand : IRequest<Unit>
{
    public string Jti { get; set; } = string.Empty;
    public DateTime TokenExpiry { get; set; }
}
