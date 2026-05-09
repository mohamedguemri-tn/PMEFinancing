namespace Domain.Entities;

using Domain.Common;

/// <summary>
/// Profile information for PME (Small-Medium Enterprise) users.
/// </summary>
public class PmeProfile : BaseEntity
{
    public Guid UserId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Sector { get; set; } = string.Empty;

    public User User { get; set; } = null!;
}