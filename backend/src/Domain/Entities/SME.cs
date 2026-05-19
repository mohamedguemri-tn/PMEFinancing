// NOT USED — stub entity, no DbSet, no handlers, no endpoints.
// Kept for future implementation reference only.
namespace Domain.Entities;

using Domain.Common;

/// <summary>
/// SME (Small and Medium Enterprise) entity.
/// </summary>
public class SME : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string RegistrationNumber { get; set; } = string.Empty;
    public string Industry { get; set; } = string.Empty;
    public decimal AnnualRevenue { get; set; }
    public int EmployeeCount { get; set; }
    public string? WalletAddress { get; set; }
    public string? ContactEmail { get; set; }
    public string? PhoneNumber { get; set; }
    public DateTime? KycVerifiedAt { get; set; }
    public bool IsVerified { get; set; } = false;
}
