using Application.Assets.Commands;
using Application.Common.Exceptions;
using Domain.Entities;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Application.Assets.Handlers;

public class TokenizeAssetCommandHandler : IRequestHandler<TokenizeAssetCommand, string>
{
    private readonly AppDbContext _context;
    private readonly ILogger<TokenizeAssetCommandHandler> _logger;

    public TokenizeAssetCommandHandler(
        AppDbContext context,
        ILogger<TokenizeAssetCommandHandler> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<string> Handle(TokenizeAssetCommand request, CancellationToken cancellationToken)
    {
        var asset = await _context.Assets
            .Include(a => a.Owner)
            .FirstOrDefaultAsync(a => a.Id == request.Id, cancellationToken);

        if (asset == null)
            throw new NotFoundException("Asset", request.Id);

        if (!string.Equals(asset.Owner.WalletAddress, request.PmeWallet, StringComparison.OrdinalIgnoreCase))
            throw new ForbiddenActionException("You do not own this asset");

        asset.Status = AssetStatus.ATO;
        asset.TokenId = request.TokenId;

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Asset {AssetId} tokenized. TxHash={TxHash}, TokenId={TokenId}",
            asset.Id, request.TransactionHash, request.TokenId);

        return request.TransactionHash;
    }
}
