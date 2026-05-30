using MediatR;

namespace Application.Loans.Commands;

public class LiquidateLoanCommand : IRequest<Unit>
{
    public Guid Id { get; set; }
    public string TransactionHash { get; set; } = string.Empty;
}
