namespace Domain.Entities;

using Domain.Common;

/// <summary>
/// Financing Request entity.
/// </summary>
public class FinancingRequest : BaseEntity
{
    public Guid SmeId { get; set; }
    public decimal RequestedAmount { get; set; }
    public string Currency { get; set; } = "USD";
    public int DurationDays { get; set; }
    public decimal InterestRate { get; set; }
    public string Status { get; set; } = "PENDING"; // PENDING, APPROVED, REJECTED, FUNDED
    public string? Description { get; set; }
    public DateTime DueDate { get; set; }
    public string? SmartContractAddress { get; set; }
}
