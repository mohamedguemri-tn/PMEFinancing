using System.ComponentModel.DataAnnotations;
using Application.Auth.Commands;
using Domain.Entities;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Auth.Handlers;

public class LogoutCommandHandler : IRequestHandler<LogoutCommand, Unit>
{
    private readonly AppDbContext _context;

    public LogoutCommandHandler(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Unit> Handle(LogoutCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Jti))
            throw new ValidationException("Jti is required");

        var expiredAt = request.TokenExpiry;
        if (expiredAt <= DateTime.UtcNow)
            throw new ValidationException("Token expiry must be in the future");

        var existing = await _context.BlocklistedTokens
            .FirstOrDefaultAsync(t => t.Jti == request.Jti, cancellationToken);

        if (existing == null)
        {
            _context.BlocklistedTokens.Add(new BlocklistedToken
            {
                Jti = request.Jti,
                ExpiresAt = expiredAt
            });
            await _context.SaveChangesAsync(cancellationToken);
        }

        return Unit.Value;
    }
}
