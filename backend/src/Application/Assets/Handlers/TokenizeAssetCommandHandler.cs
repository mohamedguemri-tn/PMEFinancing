using Application.Assets.Commands;
using Domain.Entities;
using Infrastructure.Blockchain;
using Infrastructure.Persistence;
using MediatR;

namespace Application.Assets.Handlers;

public class TokenizeAssetCommandHandler : IRequestHandler<TokenizeAssetCommand, string>
{
    private readonly AppDbContext _context;
    private readonly IBlockchainService _blockchainService;

    public TokenizeAssetCommandHandler(AppDbContext context, IBlockchainService blockchainService)
    {
        _context = context;
        _blockchainService = blockchainService;
    }

    public async Task<string> Handle(TokenizeAssetCommand request, CancellationToken cancellationToken)
    {
        var asset = await _context.Assets.FindAsync(request.Id, cancellationToken);
        if (asset == null) throw new Exception("Asset not found");

        var txHash = await _blockchainService.TokenizeAssetAsync(asset.Owner.WalletAddress, request.TokenURI, asset.AssetType);

        asset.Status = AssetStatus.ATO;
        await _context.SaveChangesAsync(cancellationToken);

        return txHash;
    }
}
