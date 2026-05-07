namespace Domain.Entities;

using Domain.Common;

/// <summary>
/// Represents a unique asset owned by an SME.
/// </summary>
public enum AssetStatus
{
    REGISTERED,
    ATO,
    COLLATERAL,
    LIQUIDATED
}

public class Asset : BaseEntity
{
    public Guid OwnerId { get; set; }
    public User Owner { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
    public string AssetType { get; set; } = string.Empty;
    public decimal EstimatedValue { get; set; }
    public AssetStatus Status { get; set; }
    public long? TokenId { get; set; }

    public ICollection<Loan> Loans { get; set; } = new List<Loan>();
}
