using Application.Common.Exceptions;
using Application.Common.Interfaces;
using Application.Loans.Commands;
using Domain.Entities;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Application.Loans.Handlers;

public class FundLoanCommandHandler : IRequestHandler<FundLoanCommand, Unit>
{
    private readonly AppDbContext _context;
    private readonly ILogger<FundLoanCommandHandler> _logger;
    private readonly INotificationService? _notificationService;

    public FundLoanCommandHandler(
        AppDbContext context,
        ILogger<FundLoanCommandHandler> logger,
        INotificationService? notificationService = null)
    {
        _context = context;
        _logger = logger;
        _notificationService = notificationService;
    }

    public async Task<Unit> Handle(FundLoanCommand request, CancellationToken cancellationToken)
    {
        var loan = await _context.Loans
            .Include(l => l.Pme)
            .Include(l => l.CollateralAsset)
            .FirstOrDefaultAsync(l => l.Id == request.Id, cancellationToken);

        if (loan == null) throw new NotFoundException("Loan", request.Id);
        if (loan.Status != LoanStatus.REQUESTED)
            throw new ForbiddenActionException("Loan is not in REQUESTED state");

        var investor = await _context.Users.FirstOrDefaultAsync(u => u.WalletAddress.ToLower() == request.InvestorWallet.ToLower(), cancellationToken);
        if (investor == null) throw new NotFoundException("Investor", request.InvestorWallet);

        loan.InvestorId = investor.Id;
        loan.Status = LoanStatus.FUNDED;
        loan.FundedAt = DateTime.UtcNow;
        loan.DueDate = DateTime.UtcNow.AddDays(loan.DurationDays);

        if (loan.CollateralAsset != null)
            loan.CollateralAsset.Status = AssetStatus.COLLATERAL;

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Loan {LoanId} funded by investor {Wallet}; txHash={TxHash}",
            loan.Id, request.InvestorWallet, request.TransactionHash);

        if (_notificationService != null && loan.Pme != null)
        {
            try
            {
                await _notificationService.SendToUserAsync(
                    loan.Pme.WalletAddress,
                    "LOAN_FUNDED",
                    $"Your loan for {loan.CollateralAsset?.Name ?? "your asset"} has been funded — {loan.RequestedAmount} ETH received");
            }
            catch { /* notification failure must never break the main operation */ }
        }

        return Unit.Value;
    }
}
