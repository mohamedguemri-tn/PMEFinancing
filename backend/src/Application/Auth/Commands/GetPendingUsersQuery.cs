using Application.Common.Models;
using MediatR;

namespace Application.Auth.Commands;

public class GetPendingUsersQuery : IRequest<PaginatedResult<PendingUserDto>>
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}

public record PendingUserDto(
    Guid UserId,
    string WalletAddress,
    string Role,
    IReadOnlyDictionary<string, string> ProfileData,
    DateTime CreatedAt);
