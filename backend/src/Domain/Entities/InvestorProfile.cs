namespace Domain.Entities;

using Domain.Common;

/// <summary>
/// Profile information for INVESTOR users.
/// </summary>
public class InvestorProfile : BaseEntity
{
    public Guid UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string InvestorType { get; set; } = string.Empty; // Individual / Institutional

    public User User { get; set; } = null!;
}