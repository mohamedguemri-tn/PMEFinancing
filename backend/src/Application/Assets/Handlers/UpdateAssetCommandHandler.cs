using Application.Assets.Commands;
using Infrastructure.Persistence;
using MediatR;

namespace Application.Assets.Handlers;

public class UpdateAssetCommandHandler : IRequestHandler<UpdateAssetCommand, Unit>
{
    private readonly AppDbContext _context;

    public UpdateAssetCommandHandler(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Unit> Handle(UpdateAssetCommand request, CancellationToken cancellationToken)
    {
        var asset = await _context.Assets.FindAsync(request.Id, cancellationToken);
        if (asset == null) throw new Exception("Asset not found");

        asset.Name = request.Name;
        asset.AssetType = request.AssetType;
        asset.EstimatedValue = request.EstimatedValue;

        await _context.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }
}
