using MediatR;

namespace Application.Loans.Queries;

public class GetRequestedLoansQuery : IRequest<List<LoanDto>>
{
}

public class LoanDto
{
    public Guid Id { get; set; }
    public Guid PmeId { get; set; }
    public string PmeWallet { get; set; } = string.Empty;
    public Guid CollateralAssetId { get; set; }
    public string AssetName { get; set; } = string.Empty;
    public decimal RequestedAmount { get; set; }
    public int DurationDays { get; set; }
}
