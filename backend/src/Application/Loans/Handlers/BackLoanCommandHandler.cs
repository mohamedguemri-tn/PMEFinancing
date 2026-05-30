using Application.Common.Exceptions;
using Application.Common.Interfaces;
using Application.Loans.Commands;
using Domain.Entities;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Loans.Handlers;

public class BackLoanCommandHandler : IRequestHandler<BackLoanCommand, Unit>
{
    private readonly AppDbContext _context;
    private readonly INotificationService? _notificationService;

    public BackLoanCommandHandler(AppDbContext context, INotificationService? notificationService = null)
    {
        _context = context;
        _notificationService = notificationService;
    }

    public async Task<Unit> Handle(BackLoanCommand request, CancellationToken cancellationToken)
    {
        var loan = await _context.Loans
            .Include(l => l.Pme)
            .FirstOrDefaultAsync(l => l.Id == request.LoanId, cancellationToken);

        if (loan == null)
            throw new NotFoundException("Loan", request.LoanId);

        if (loan.Status != LoanStatus.REQUESTED)
            throw new ForbiddenActionException("Loan is not open for backing");

        if (loan.GuarantorId.HasValue)
            throw new ForbiddenActionException("Loan already has a guarantor");

        var guarantor = await _context.Users
            .FirstOrDefaultAsync(u => u.WalletAddress == request.GuarantorWallet, cancellationToken);

        if (guarantor == null)
            throw new NotFoundException("User", request.GuarantorWallet);

        var asset = await _context.Assets
            .FirstOrDefaultAsync(a => a.Id == request.GuarantorAssetId, cancellationToken);

        if (asset == null)
            throw new NotFoundException("Asset", request.GuarantorAssetId);

        if (asset.OwnerId != guarantor.Id)
            throw new ForbiddenActionException("Asset does not belong to this guarantor");

        loan.GuarantorId = guarantor.Id;
        loan.GuarantorAssetId = asset.Id;
        loan.GuaranteedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        if (_notificationService != null && loan.Pme != null)
        {
            try
            {
                await _notificationService.SendToUserAsync(
                    loan.Pme.WalletAddress,
                    "LOAN_BACKED",
                    $"A guarantor is backing your loan for {asset.Name}");
            }
            catch { /* notification failure must never break the main operation */ }
        }

        return Unit.Value;
    }
}
