using System.ComponentModel.DataAnnotations;
using Application.Auth.Commands;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Auth.Handlers;

public class RejectUserCommandHandler : IRequestHandler<RejectUserCommand, Unit>
{
    private readonly AppDbContext _context;

    public RejectUserCommandHandler(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Unit> Handle(RejectUserCommand request, CancellationToken cancellationToken)
    {
        if (request.UserId == Guid.Empty)
            throw new ValidationException("UserId is required");

        if (string.IsNullOrWhiteSpace(request.Reason))
            throw new ValidationException("Reason is required");

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);

        if (user == null)
            throw new KeyNotFoundException("User not found");

        _context.Users.Remove(user);
        await _context.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}
