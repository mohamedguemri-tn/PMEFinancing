using Application.Admin.Commands;
using Application.Common.Exceptions;
using Domain.Entities;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Admin.Handlers;

public class DeleteUserCommandHandler : IRequestHandler<DeleteUserCommand, Unit>
{
    private readonly AppDbContext _context;

    public DeleteUserCommandHandler(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Unit> Handle(DeleteUserCommand request, CancellationToken ct)
    {
        var user = await _context.Users
            .Include(u => u.Assets)
            .FirstOrDefaultAsync(u => u.Id == request.UserId, ct)
            ?? throw new NotFoundException("User", request.UserId);

        if (user.Role == Role.GOVERNOR)
            throw new ForbiddenActionException("Cannot delete Governor account");

        // Soft-delete assets; loans are kept intact for the audit trail.
        foreach (var asset in user.Assets.Where(a => !a.IsDeleted))
            asset.IsDeleted = true;

        user.IsDeleted = true;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);
        return Unit.Value;
    }
}
