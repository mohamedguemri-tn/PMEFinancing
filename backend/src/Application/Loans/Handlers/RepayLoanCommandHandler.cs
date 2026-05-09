using Application.Loans.Commands;
using Domain.Entities;
using Infrastructure.Blockchain;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Application.Loans.Handlers;

public class RepayLoanCommandHandler : IRequestHandler<RepayLoanCommand, Unit>
{
    private readonly AppDbContext _context;
    private readonly IBlockchainService _blockchainService;
    private readonly ILogger<RepayLoanCommandHandler> _logger;

    public RepayLoanCommandHandler(AppDbContext context, IBlockchainService blockchainService, ILogger<RepayLoanCommandHandler> logger)
    {
        _context = context;
        _blockchainService = blockchainService;
        _logger = logger;
    }

    public async Task<Unit> Handle(RepayLoanCommand request, CancellationToken cancellationToken)
    {
        var loan = await _context.Loans
            .Include(l => l.Pme)
            .FirstOrDefaultAsync(l => l.Id == request.Id, cancellationToken);
        if (loan == null) throw new Exception("Loan not found");

        loan.Status = LoanStatus.REPAID;
        loan.RepaidAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        try
        {
            await _blockchainService.RepayLoanAsync(loan.Pme.WalletAddress, (uint)loan.Id.GetHashCode(), request.AmountEth);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Loan {LoanId} repaid in DB but blockchain call failed", loan.Id);
        }

        return Unit.Value;
    }
}
