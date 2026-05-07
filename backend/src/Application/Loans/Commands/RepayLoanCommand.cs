using MediatR;

namespace Application.Loans.Commands;

public class RepayLoanCommand : IRequest
{
    public Guid Id { get; set; }
    public decimal AmountEth { get; set; }
}
