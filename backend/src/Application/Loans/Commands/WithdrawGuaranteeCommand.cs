using MediatR;

namespace Application.Loans.Commands;

public class WithdrawGuaranteeCommand : IRequest<Unit>
{
    public Guid LoanId { get; set; }
    public string GuarantorWallet { get; set; } = string.Empty;
}
