using Application.Loans.Commands;
using Domain.Entities;
using Infrastructure.Blockchain;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Loans.Handlers;

public class RepayLoanCommandHandler : IRequestHandler<RepayLoanCommand, Unit>
{
    private readonly AppDbContext _context;
    private readonly IBlockchainService _blockchainService;

    public RepayLoanCommandHandler(AppDbContext context, IBlockchainService blockchainService)
    {
        _context = context;
        _blockchainService = blockchainService;
    }

    public async Task<Unit> Handle(RepayLoanCommand request, CancellationToken cancellationToken)
    {
        var loan = await _context.Loans.FindAsync(request.Id, cancellationToken);
        if (loan == null) throw new Exception("Loan not found");

        await _blockchainService.RepayLoanAsync(loan.Pme.WalletAddress, (uint)loan.Id.GetHashCode(), request.AmountEth);

        loan.Status = LoanStatus.REPAID;
        loan.RepaidAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }
}
