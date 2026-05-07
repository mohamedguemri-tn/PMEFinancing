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

        var user = await _context.Users.FirstOrDefaultAsync(
            u => u.WalletAddress == request.WalletAddress, cancellationToken);

        if (user == null)
        {
            user = new User
            {
                Id = Guid.NewGuid(),
                WalletAddress = request.WalletAddress,
                Role = Role.PME,
                IsApproved = false,
                CreatedAt = DateTime.UtcNow,
                Nonce = nonce
            };
            _context.Users.Add(user);
        }
        else
        {
            user.Nonce = nonce;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return nonce;
    }
}