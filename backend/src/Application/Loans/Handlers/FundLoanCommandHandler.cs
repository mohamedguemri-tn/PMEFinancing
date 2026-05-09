using Application.Loans.Commands;
using Domain.Entities;
using Infrastructure.Blockchain;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Application.Loans.Handlers;

public class FundLoanCommandHandler : IRequestHandler<FundLoanCommand, Unit>
{
    private readonly AppDbContext _context;
    private readonly IBlockchainService _blockchainService;
    private readonly ILogger<FundLoanCommandHandler> _logger;

    public FundLoanCommandHandler(AppDbContext context, IBlockchainService blockchainService, ILogger<FundLoanCommandHandler> logger)
    {
        _context = context;
        _blockchainService = blockchainService;
        _logger = logger;
    }

    public async Task<Unit> Handle(FundLoanCommand request, CancellationToken cancellationToken)
    {
        var loan = await _context.Loans.FindAsync(request.Id, cancellationToken);
        if (loan == null) throw new Exception("Loan not found");

        var investor = await _context.Users.FirstOrDefaultAsync(u => u.WalletAddress == request.InvestorWallet, cancellationToken);
        if (investor == null) throw new Exception("Investor not found");

        loan.InvestorId = investor.Id;
        loan.Status = LoanStatus.FUNDED;
        loan.FundedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        try
        {
            await _blockchainService.FundLoanAsync(request.InvestorWallet, (uint)loan.Id.GetHashCode(), request.AmountEth);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Loan {LoanId} funded in DB but blockchain call failed", loan.Id);
        }

        return Unit.Value;
    }
}
