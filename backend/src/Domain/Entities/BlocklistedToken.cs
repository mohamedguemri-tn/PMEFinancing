namespace Domain.Entities;

using Domain.Common;

/// <summary>
/// Blacklisted JWT tokens (by Jti claim). Used for logout and token revocation.
/// </summary>
public class BlocklistedToken : BaseEntity
{
    public string Jti { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
}