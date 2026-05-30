using MediatR;

namespace Application.Loans.Commands;

public class BackLoanCommand : IRequest<Unit>
{
    public Guid LoanId { get; set; }
    public Guid GuarantorAssetId { get; set; }
    public string GuarantorWallet { get; set; } = string.Empty;
}
