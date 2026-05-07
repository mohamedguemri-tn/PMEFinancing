using Application.Loans.Commands;
using Domain.Entities;
using Infrastructure.Blockchain;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Loans.Handlers;

public class FundLoanCommandHandler : IRequestHandler<FundLoanCommand, Unit>
{
    private readonly AppDbContext _context;
    private readonly IBlockchainService _blockchainService;

    public FundLoanCommandHandler(AppDbContext context, IBlockchainService blockchainService)
    {
        _context = context;
        _blockchainService = blockchainService;
    }

    public async Task<Unit>  Handle(FundLoanCommand request, CancellationToken cancellationToken)
    {
        var loan = await _context.Loans.FindAsync(request.Id, cancellationToken);
        if (loan == null) throw new Exception("Loan not found");

        var investor = await _context.Users.FirstOrDefaultAsync(u => u.WalletAddress == request.InvestorWallet, cancellationToken);
        if (investor == null) throw new Exception("Investor not found");

        await _blockchainService.FundLoanAsync(request.InvestorWallet, (uint)loan.Id.GetHashCode(), request.AmountEth);

        loan.InvestorId = investor.Id;
        loan.Status = LoanStatus.FUNDED;
        loan.FundedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }
}
