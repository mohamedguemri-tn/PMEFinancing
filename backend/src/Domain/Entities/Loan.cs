namespace Domain.Entities;

using Domain.Common;

/// <summary>
/// Represents a loan backed by an SME asset.
/// </summary>
public enum LoanStatus
{
    REQUESTED,
    FUNDED,
    REPAID,
    DEFAULTED,
    LIQUIDATED
}

public class Loan : BaseEntity
{
    public Guid PmeId { get; set; }
    public User Pme { get; set; } = null!;

    public Guid? InvestorId { get; set; }
    public User? Investor { get; set; }

    public Guid CollateralAssetId { get; set; }
    public Asset CollateralAsset { get; set; } = null!;

    public decimal RequestedAmount { get; set; }
    public LoanStatus Status { get; set; }
    public int DurationDays { get; set; }
    public DateTime? FundedAt { get; set; }
    public DateTime? RepaidAt { get; set; }
    public long? OnChainLoanId { get; set; }
    public DateTime? DueDate { get; set; }
    public DateTime? LiquidatedAt { get; set; }

    public Guid? GuarantorId { get; set; }
    public User? Guarantor { get; set; }
    public Guid? GuarantorAssetId { get; set; }
    public Asset? GuarantorAsset { get; set; }
    public DateTime? GuaranteedAt { get; set; }
}
