using Application.Common.Exceptions;
using Application.Common.Interfaces;
using Application.Loans.Commands;
using Domain.Entities;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Loans.Handlers;

public class WithdrawGuaranteeCommandHandler : IRequestHandler<WithdrawGuaranteeCommand, Unit>
{
    private readonly AppDbContext _context;
    private readonly INotificationService? _notificationService;

    public WithdrawGuaranteeCommandHandler(AppDbContext context, INotificationService? notificationService = null)
    {
        _context = context;
        _notificationService = notificationService;
    }

    public async Task<Unit> Handle(WithdrawGuaranteeCommand request, CancellationToken cancellationToken)
    {
        var loan = await _context.Loans
            .Include(l => l.Pme)
            .Include(l => l.Guarantor)
            .Include(l => l.CollateralAsset)
            .FirstOrDefaultAsync(l => l.Id == request.LoanId, cancellationToken);

        if (loan == null)
            throw new NotFoundException("Loan", request.LoanId);

        if (loan.Status != LoanStatus.REQUESTED)
            throw new ForbiddenActionException("Guarantee can only be withdrawn from a REQUESTED loan");

        if (loan.Guarantor == null ||
            !string.Equals(loan.Guarantor.WalletAddress, request.GuarantorWallet, StringComparison.OrdinalIgnoreCase))
            throw new ForbiddenActionException("You are not the guarantor of this loan");

        var pmeWallet = loan.Pme?.WalletAddress;
        var assetName = loan.CollateralAsset?.Name ?? "your asset";

        loan.GuarantorId = null;
        loan.GuarantorAssetId = null;
        loan.GuaranteedAt = null;

        await _context.SaveChangesAsync(cancellationToken);

        if (_notificationService != null && pmeWallet != null)
        {
            try
            {
                await _notificationService.SendToUserAsync(
                    pmeWallet,
                    "GUARANTEE_WITHDRAWN",
                    $"Guarantor withdrew backing from your loan for {assetName}");
            }
            catch { /* notification failure must never break the main operation */ }
        }

        return Unit.Value;
    }
}
