using MediatR;

namespace Application.Loans.Commands;

public class RepayLoanCommand : IRequest<Unit>
{
    public Guid Id { get; set; }
    public decimal AmountEth { get; set; }
    public string PmeWallet { get; set; } = string.Empty;
}
