using MediatR;

namespace Application.Loans.Commands;

public class FundLoanCommand : IRequest<Unit>
{
    public Guid Id { get; set; }
    public string InvestorWallet { get; set; } = string.Empty;
    public decimal AmountEth { get; set; }
    public string TransactionHash { get; set; } = string.Empty;
}
