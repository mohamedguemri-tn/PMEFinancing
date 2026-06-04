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
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.UserId, ct);

        if (user == null)
            throw new NotFoundException("User", request.UserId);

        if (user.Role == Role.GOVERNOR)
            throw new ForbiddenActionException("Cannot delete Governor account");

        _context.Users.Remove(user);
        await _context.SaveChangesAsync(ct);

        return Unit.Value;
    }
}
