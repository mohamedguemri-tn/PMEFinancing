namespace Domain.Entities;

using Domain.Common;

/// <summary>
/// Profile information for GUARANTOR users.
/// </summary>
public class GuarantorProfile : BaseEntity
{
    public Guid UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string OrganizationName { get; set; } = string.Empty;

    public User User { get; set; } = null!;
}