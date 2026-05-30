using Application.Common.Exceptions;
using Application.Common.Interfaces;
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
    private readonly INotificationService? _notificationService;

    public RepayLoanCommandHandler(
        AppDbContext context,
        ILogger<RepayLoanCommandHandler> logger,
        INotificationService? notificationService = null)
    {
        _context = context;
        _logger = logger;
        _notificationService = notificationService;
    }

    public async Task<Unit> Handle(RepayLoanCommand request, CancellationToken cancellationToken)
    {
        var loan = await _context.Loans
            .Include(l => l.Pme)
            .Include(l => l.Investor)
            .Include(l => l.CollateralAsset)
            .FirstOrDefaultAsync(l => l.Id == request.Id, cancellationToken);

        if (loan == null)
            throw new NotFoundException("Loan", request.Id);
        if (loan.Status != LoanStatus.FUNDED)
            throw new ForbiddenActionException("Loan must be in FUNDED state to repay");
        if (!string.Equals(loan.Pme.WalletAddress, request.PmeWallet, StringComparison.OrdinalIgnoreCase))
            throw new ForbiddenActionException("You do not own this loan");

        loan.Status = LoanStatus.REPAID;
        loan.RepaidAt = DateTime.UtcNow;

        if (loan.CollateralAsset != null)
            loan.CollateralAsset.Status = AssetStatus.ATO;

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Loan {LoanId} repaid by PME {Wallet}", loan.Id, loan.Pme.WalletAddress);

        if (_notificationService != null && loan.Investor != null)
        {
            try
            {
                await _notificationService.SendToUserAsync(
                    loan.Investor.WalletAddress,
                    "LOAN_REPAID",
                    $"Loan for {loan.CollateralAsset?.Name ?? "an asset"} has been fully repaid");
            }
            catch { /* notification failure must never break the main operation */ }
        }

        return Unit.Value;
    }
}
