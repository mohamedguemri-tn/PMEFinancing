namespace Domain.Entities;

using Domain.Common;

/// <summary>
/// Represents a platform user with an on-chain wallet and role.
/// </summary>
public enum Role
{
    PME,
    INVESTOR,
    GUARANTOR,
    GOVERNOR
}

public class User : BaseEntity
{
    public string WalletAddress { get; set; } = string.Empty;
    public Role Role { get; set; }
    public bool IsApproved { get; set; }
    public string? Nonce { get; set; }  // add this

    public ICollection<Asset> Assets { get; set; } = new List<Asset>();
    public ICollection<Loan> PmeLoans { get; set; } = new List<Loan>();
    public ICollection<Loan> InvestorLoans { get; set; } = new List<Loan>();
}
