using Application.Common.Exceptions;
using Application.Loans.Commands;
using Domain.Entities;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Application.Loans.Handlers;

public class RepayLoanCommandHandler : IRequestHandler<RepayLoanCommand, Unit>
{
    private readonly AppDbContext _context;
    private readonly ILogger<RepayLoanCommandHandler> _logger;

    public RepayLoanCommandHandler(AppDbContext context, ILogger<RepayLoanCommandHandler> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Unit> Handle(RepayLoanCommand request, CancellationToken cancellationToken)
    {
        var loan = await _context.Loans
            .Include(l => l.Pme)
            .FirstOrDefaultAsync(l => l.Id == request.Id, cancellationToken);
        if (loan == null)
            throw new NotFoundException("Loan", request.Id);
        if (loan.Status != LoanStatus.FUNDED)
            throw new ForbiddenActionException("Loan must be in FUNDED state to repay");
        if (!string.Equals(loan.Pme.WalletAddress, request.PmeWallet, StringComparison.OrdinalIgnoreCase))
            throw new ForbiddenActionException("You do not own this loan");

        loan.Status = LoanStatus.REPAID;
        loan.RepaidAt = DateTime.UtcNow;

        var collateralAsset = await _context.Assets.FindAsync(loan.CollateralAssetId, cancellationToken);
        if (collateralAsset != null)
            collateralAsset.Status = AssetStatus.ATO;

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Loan {LoanId} repaid by PME {Wallet}", loan.Id, loan.Pme.WalletAddress);

        return Unit.Value;
    }
}
