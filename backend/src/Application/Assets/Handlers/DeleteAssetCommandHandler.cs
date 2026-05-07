using Application.Assets.Commands;
using Infrastructure.Persistence;
using MediatR;

namespace Application.Assets.Handlers;

public class DeleteAssetCommandHandler : IRequestHandler<DeleteAssetCommand, Unit>
{
    private readonly AppDbContext _context;

    public DeleteAssetCommandHandler(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Unit> Handle(DeleteAssetCommand request, CancellationToken cancellationToken)
    {
        var asset = await _context.Assets.FindAsync(request.Id, cancellationToken);
        if (asset == null) throw new Exception("Asset not found");

        _context.Assets.Remove(asset);
        await _context.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }
}
