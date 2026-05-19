using Application.Auth.Commands;
using Application.Common.Exceptions;
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

    public ApproveUserCommandHandler(
        AppDbContext context,
        IBlockchainService blockchainService,
        ILogger<ApproveUserCommandHandler> logger)
    {
        _context = context;
        _blockchainService = blockchainService;
        _logger = logger;
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
                _logger.LogError(ex, "AssetToken.grantRole(PME) failed for user {UserId} ({Wallet}) — mint will be rejected until fixed", user.Id, user.WalletAddress);
            }
        }

        return Unit.Value;
    }
}
