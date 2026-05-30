using Application.Common.Models;
using MediatR;

namespace Application.Loans.Queries;

public class GetRequestedLoansQuery : IRequest<PaginatedResult<LoanDto>>
{
    public string? PmeWallet { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
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
    public long? OnChainLoanId { get; set; }
    public DateTime? DueDate { get; set; }
    public bool IsOverdue => DueDate.HasValue && DueDate.Value < DateTime.UtcNow && Status == "FUNDED";
    public Guid? GuarantorId { get; init; }
    public string? GuarantorWallet { get; init; }
    public string? GuarantorAssetName { get; init; }
    public decimal? GuarantorAssetValue { get; init; }
    public bool HasGuarantor => GuarantorId.HasValue;
}
