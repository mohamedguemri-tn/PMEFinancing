using Application.Auth.Commands;
using Domain.Entities;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Nethereum.Signer;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;

namespace Application.Auth.Handlers;

public class VerifySignatureCommandHandler : IRequestHandler<VerifySignatureCommand, string>
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;

    public VerifySignatureCommandHandler(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    public async Task<string> Handle(VerifySignatureCommand request, CancellationToken cancellationToken)
{
    var user = await _context.Users.FirstOrDefaultAsync(u => u.WalletAddress == request.WalletAddress, cancellationToken);
    if (user == null) throw new Exception("User not found");
    Console.WriteLine($"Stored nonce: {user.Nonce}");
    Console.WriteLine($"Incoming nonce: {request.Nonce}");
    // Validate nonce against DB, not client-supplied value
    if (user.Nonce != request.Nonce)
        throw new Exception("Invalid or expired nonce");

    var signer = new EthereumMessageSigner();
    var recoveredAddress = signer.EncodeUTF8AndEcRecover(request.Nonce, request.Signature);

    if (!string.Equals(recoveredAddress, request.WalletAddress, StringComparison.OrdinalIgnoreCase))
        throw new Exception("Invalid signature");

    // Invalidate nonce after use (one-time use)
    user.Nonce = null;
    await _context.SaveChangesAsync(cancellationToken);

    // Generate JWT
    var claims = new[]
    {
        new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
        new Claim("wallet", user.WalletAddress),
        new Claim(ClaimTypes.Role, user.Role.ToString())
    };

    var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Secret"]!));
    var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
    var token = new JwtSecurityToken(
        issuer: "SMEFinancing",
        audience: "SMEFinancing",
        claims: claims,
        expires: DateTime.Now.AddHours(24),
        signingCredentials: creds);

    return new JwtSecurityTokenHandler().WriteToken(token);
}
}
