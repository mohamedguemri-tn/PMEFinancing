using MediatR;

namespace Application.Admin.Queries;

public class GetRecentActivityQuery : IRequest<List<ActivityDto>> { }

public class ActivityDto
{
    public string Type { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public DateTime Timestamp { get; init; }
    public string WalletAddress { get; init; } = string.Empty;
}
