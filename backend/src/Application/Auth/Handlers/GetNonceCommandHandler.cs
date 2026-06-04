using Application.Auth.Commands;
using Domain.Entities;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Auth.Handlers;

public class GetNonceCommandHandler : IRequestHandler<GetNonceCommand, string>
{
    private readonly AppDbContext _context;

    public GetNonceCommandHandler(AppDbContext context)
    {
        _context = context;
    }

    public async Task<string> Handle(GetNonceCommand request, CancellationToken cancellationToken)
    {
        var nonce = Guid.NewGuid().ToString();

        // Create or update user if not exists
        var user = await _context.Users.FirstOrDefaultAsync(
            u => u.WalletAddress.ToLower() == request.WalletAddress.ToLower() && !u.IsDeleted, cancellationToken);

        if (user == null)
        {
            user = new User
            {
                Id = Guid.NewGuid(),
                WalletAddress = request.WalletAddress.ToLower(),
                Role = Role.PME,
                IsApproved = false,
                CreatedAt = DateTime.UtcNow
            };
            _context.Users.Add(user);
            await _context.SaveChangesAsync(cancellationToken);
        }

        // Store nonce with 10-minute expiration
        var existingNonce = await _context.Nonces.FirstOrDefaultAsync(
            n => n.WalletAddress.ToLower() == request.WalletAddress.ToLower(), cancellationToken);

        if (existingNonce != null)
        {
            existingNonce.Value = nonce;
            existingNonce.ExpiresAt = DateTime.UtcNow.AddMinutes(10);
        }
        else
        {
            _context.Nonces.Add(new Nonce
            {
                WalletAddress = request.WalletAddress.ToLower(),
                Value = nonce,
                ExpiresAt = DateTime.UtcNow.AddMinutes(10)
            });
        }

        await _context.SaveChangesAsync(cancellationToken);
        return nonce;
    }
}