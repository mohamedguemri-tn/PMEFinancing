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
    DEFAULTED
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
}
