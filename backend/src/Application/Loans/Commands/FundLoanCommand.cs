using MediatR;

namespace Application.Loans.Commands;

public class FundLoanCommand : IRequest
{
    public Guid Id { get; set; }
    public string InvestorWallet { get; set; } = string.Empty;
    public decimal AmountEth { get; set; }
}
