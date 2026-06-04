using Application.Auth.Commands;
using Application.Common.Exceptions;
using Application.Common.Interfaces;
using Domain.Entities;
using Infrastructure.Blockchain;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Application.Auth.Handlers;

public class ApproveUserCommandHandler : IRequestHandler<ApproveUserCommand, Unit>
{
    private readonly AppDbContext _context;
    private readonly IBlockchainService _blockchainService;
    private readonly ILogger<ApproveUserCommandHandler> _logger;
    private readonly INotificationService? _notificationService;

    public ApproveUserCommandHandler(
        AppDbContext context,
        IBlockchainService blockchainService,
        ILogger<ApproveUserCommandHandler> logger,
        INotificationService? notificationService = null)
    {
        _context = context;
        _blockchainService = blockchainService;
        _logger = logger;
        _notificationService = notificationService;
    }

    public async Task<Unit> Handle(ApproveUserCommand request, CancellationToken cancellationToken)
    {
        if (request.UserId == Guid.Empty)
            throw new ValidationException(new Dictionary<string, string[]> { ["UserId"] = ["UserId is required"] });

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);

        if (user == null)
            throw new NotFoundException("User", request.UserId);

        user.IsApproved = true;
        await _context.SaveChangesAsync(cancellationToken);

        try
        {
            var txHash = await _blockchainService.RegisterUserAsync(user.WalletAddress, user.Role.ToString());
            _logger.LogInformation("Governor {GovernorWallet} approved user {UserId} on-chain; txHash={TxHash}", request.GovernorWalletAddress, user.Id, txHash);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Governor {GovernorWallet} approval succeeded in SQL but blockchain registerUser failed for user {UserId}", request.GovernorWalletAddress, user.Id);
        }

        if (user.Role == Role.PME)
        {
            try
            {
                await _blockchainService.GrantAssetTokenRoleAsync(user.WalletAddress);
                _logger.LogInformation("AssetToken.grantRole(PME) succeeded for user {UserId} ({Wallet})", user.Id, user.WalletAddress);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AssetToken.grantRole(PME) failed for user {UserId} ({Wallet})", user.Id, user.WalletAddress);
            }

            try
            {
                await _blockchainService.GrantLoanManagerRoleAsync(user.WalletAddress, "PME");
                _logger.LogInformation("LoanManager.grantRole(PME) succeeded for user {UserId} ({Wallet})", user.Id, user.WalletAddress);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "LoanManager.grantRole(PME) failed for user {UserId} ({Wallet})", user.Id, user.WalletAddress);
            }
        }
        else if (user.Role == Role.INVESTOR)
        {
            try
            {
                await _blockchainService.GrantLoanManagerRoleAsync(user.WalletAddress, "INVESTOR");
                _logger.LogInformation("LoanManager.grantRole(INVESTOR) succeeded for user {UserId} ({Wallet})", user.Id, user.WalletAddress);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "LoanManager.grantRole(INVESTOR) failed for user {UserId} ({Wallet})", user.Id, user.WalletAddress);
            }
        }

        if (_notificationService != null)
        {
            try
            {
                await _notificationService.SendToUserAsync(
                    user.WalletAddress,
                    "ACCOUNT_APPROVED",
                    "Your account has been approved. You can now log in.");
            }
            catch { /* notification failure must never break the main operation */ }
        }

        return Unit.Value;
    }
}
