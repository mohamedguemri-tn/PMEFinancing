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
    public string SmeName { get; set; } = string.Empty;
    public Guid CollateralAssetId { get; set; }
    public string AssetName { get; set; } = string.Empty;
    public string CollateralType { get; set; } = string.Empty;
    public decimal CollateralValue { get; set; }
    public decimal RequestedAmount { get; set; }
    public int DurationDays { get; set; }
    public decimal LoanToValue { get; set; }
    public string Status { get; set; } = string.Empty;
    public string RiskProfile { get; set; } = string.Empty;
}
