using System.ComponentModel.DataAnnotations;
using Application.Auth.Commands;
using Domain.Entities;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Auth.Handlers;

public class GetOrCreateNonceQueryHandler : IRequestHandler<GetOrCreateNonceQuery, string>
{
    private readonly AppDbContext _context;

    public GetOrCreateNonceQueryHandler(AppDbContext context)
    {
        _context = context;
    }

    public async Task<string> Handle(GetOrCreateNonceQuery request, CancellationToken cancellationToken)
    {
        var walletAddress = request.WalletAddress?.Trim().ToLower();
        if (string.IsNullOrWhiteSpace(walletAddress))
            throw new ValidationException("Wallet address is required");

        var utcNow = DateTime.UtcNow;

        var expiredNonces = await _context.Nonces
            .Where(n => n.WalletAddress.ToLower() == walletAddress && n.ExpiresAt <= utcNow)
            .ToListAsync(cancellationToken);

        if (expiredNonces.Any())
        {
            _context.Nonces.RemoveRange(expiredNonces);
            await _context.SaveChangesAsync(cancellationToken);
        }

        var existingNonce = await _context.Nonces
            .FirstOrDefaultAsync(n => n.WalletAddress.ToLower() == walletAddress && n.ExpiresAt > utcNow, cancellationToken);

        if (existingNonce != null)
            return existingNonce.Value;

        var nonceValue = Guid.NewGuid().ToString();

        _context.Nonces.Add(new Nonce
        {
            WalletAddress = walletAddress,
            Value = nonceValue,
            ExpiresAt = utcNow.AddMinutes(5)
        });

        await _context.SaveChangesAsync(cancellationToken);
        return nonceValue;
    }
}
