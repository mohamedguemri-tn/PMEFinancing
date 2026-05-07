using Application.Assets.Commands;
using Domain.Entities;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Assets.Handlers;

public class CreateAssetCommandHandler : IRequestHandler<CreateAssetCommand, Guid>
{
    private readonly AppDbContext _context;

    public CreateAssetCommandHandler(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Guid> Handle(CreateAssetCommand request, CancellationToken cancellationToken)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.WalletAddress == request.PmeWallet, cancellationToken);
        if (user == null) throw new Exception("User not found");

        var asset = new Asset
        {
            OwnerId = user.Id,
            Name = request.Name,
            AssetType = request.AssetType,
            EstimatedValue = request.EstimatedValue,
            Status = AssetStatus.REGISTERED
        };

        _context.Assets.Add(asset);
        await _context.SaveChangesAsync(cancellationToken);

        return asset.Id;
    }
}
