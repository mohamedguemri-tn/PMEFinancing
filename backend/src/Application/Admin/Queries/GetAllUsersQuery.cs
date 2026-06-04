using Application.Common.Models;
using MediatR;

namespace Application.Admin.Queries;

public class GetAllUsersQuery : IRequest<PaginatedResult<UserDto>>
{
    public string? Role { get; set; }
    public string? Search { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class UserDto
{
    public Guid Id { get; init; }
    public string WalletAddress { get; init; } = string.Empty;
    public string Role { get; init; } = string.Empty;
    public bool IsApproved { get; init; }
    public DateTime CreatedAt { get; init; }
    public string? CompanyName { get; init; }
}
