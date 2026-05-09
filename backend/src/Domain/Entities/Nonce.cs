namespace Domain.Entities;

using Domain.Common;

/// <summary>
/// One-time nonce values for wallet authentication. No foreign key — standalone table.
/// </summary>
public class Nonce : BaseEntity
{
    public string WalletAddress { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
}