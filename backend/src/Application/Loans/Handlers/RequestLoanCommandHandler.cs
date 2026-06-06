using Application.Common.Exceptions;
using Application.Common.Interfaces;
using Application.Loans.Commands;
using Domain.Entities;
using Infrastructure.Blockchain;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Loans.Handlers;

public class RequestLoanCommandHandler : IRequestHandler<RequestLoanCommand, Guid>
{
    private readonly AppDbContext _context;
    private readonly IBlockchainService _blockchainService;
    private readonly INotificationService? _notificationService;

    public RequestLoanCommandHandler(
        AppDbContext context,
        IBlockchainService blockchainService,
        INotificationService? notificationService = null)
    {
        _context = context;
        _blockchainService = blockchainService;
        _notificationService = notificationService;
    }

    public async Task<Guid> Handle(RequestLoanCommand request, CancellationToken cancellationToken)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.WalletAddress.ToLower() == request.PmeWallet.ToLower(), cancellationToken);
        if (user == null) throw new Exception("User not found");

        var asset = await _context.Assets.FindAsync(request.CollateralAssetId, cancellationToken);
        if (asset == null) throw new Exception("Asset not found");

        if (asset.OwnerId != user.Id)
            throw new ForbiddenActionException("You do not own this asset");

        var loan = new Loan
        {
            PmeId = user.Id,
            CollateralAssetId = request.CollateralAssetId,
            RequestedAmount = request.RequestedAmount,
            Status = LoanStatus.REQUESTED,
            DurationDays = request.DurationDays,
            OnChainLoanId = request.OnChainLoanId,
        };

        _context.Loans.Add(loan);
        await _context.SaveChangesAsync(cancellationToken);

        if (_notificationService != null)
        {
            try
            {
                var message = $"New loan request: {asset.Name} — {loan.RequestedAmount} ETH";
                await _notificationService.SendToRoleAsync("INVESTOR", "NEW_LOAN_REQUEST", message);
                await _notificationService.SendToRoleAsync("GUARANTOR", "NEW_LOAN_REQUEST",
                    $"New loan request available to back: {asset.Name} — {loan.RequestedAmount} ETH");
            }
            catch { /* notification failure must never break the main operation */ }
        }

        return loan.Id;
    }
}
