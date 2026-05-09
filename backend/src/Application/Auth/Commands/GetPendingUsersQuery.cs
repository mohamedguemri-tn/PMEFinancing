using MediatR;

namespace Application.Auth.Commands;

public class GetPendingUsersQuery : IRequest<IEnumerable<PendingUserDto>>
{
}

public record PendingUserDto(
    Guid UserId,
    string WalletAddress,
    string Role,
    IReadOnlyDictionary<string, string> ProfileData,
    DateTime CreatedAt);
