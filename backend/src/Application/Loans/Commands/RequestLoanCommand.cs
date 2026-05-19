using MediatR;

namespace Application.Loans.Commands;

public class RequestLoanCommand : IRequest<Guid>
{
    public Guid CollateralAssetId { get; set; }
    public decimal RequestedAmount { get; set; }
    public int DurationDays { get; set; }
    public string PmeWallet { get; set; } = string.Empty;
    public long OnChainLoanId { get; set; }
    public string TransactionHash { get; set; } = string.Empty;
}
