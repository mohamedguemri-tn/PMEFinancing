using MediatR;

namespace Application.Admin.Queries;

public class GetPlatformStatsQuery : IRequest<PlatformStatsDto> { }

public class PlatformStatsDto
{
    public int TotalUsers { get; init; }
    public int TotalPmes { get; init; }
    public int TotalInvestors { get; init; }
    public int PendingApprovals { get; init; }
    public int TotalAssets { get; init; }
    public int TokenizedAssets { get; init; }
    public int TotalLoans { get; init; }
    public int ActiveLoans { get; init; }
    public int OverdueLoans { get; init; }
    public int RepaidLoans { get; init; }
    public int LiquidatedLoans { get; init; }
    public decimal TotalFundedAmount { get; init; }
    public decimal TotalRepaidAmount { get; init; }
}
