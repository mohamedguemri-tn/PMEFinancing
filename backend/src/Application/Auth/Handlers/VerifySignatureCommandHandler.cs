using Application.Auth.Commands;
using Domain.Entities;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Nethereum.Signer;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

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
        // Verify user exists
        var user = await _context.Users.FirstOrDefaultAsync(
            u => u.WalletAddress.ToLower() == request.WalletAddress.ToLower(), cancellationToken);
        if (user == null)
            throw new Exception("User not found");

        // Retrieve and validate nonce from Nonce table
        var nonceRecord = await _context.Nonces.FirstOrDefaultAsync(
            n => n.WalletAddress.ToLower() == request.WalletAddress.ToLower(), cancellationToken);
        
        if (nonceRecord == null)
            throw new Exception("Nonce not found");
        
        if (nonceRecord.ExpiresAt < DateTime.UtcNow)
            throw new Exception("Nonce has expired");
        
        // Verify signature
        var signer = new EthereumMessageSigner();
        var recoveredAddress = signer.EncodeUTF8AndEcRecover(nonceRecord.Value, request.Signature);

        if (!string.Equals(recoveredAddress, request.WalletAddress, StringComparison.OrdinalIgnoreCase))
            throw new Exception("Invalid signature");

        // Invalidate nonce after use (one-time use)
        _context.Nonces.Remove(nonceRecord);
        await _context.SaveChangesAsync(cancellationToken);

        // Generate JWT
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim("wallet", user.WalletAddress),
            new Claim("role", user.Role.ToString()),          // short name for SignalR hub lookup
            new Claim(ClaimTypes.Role, user.Role.ToString())  // long URI for ASP.NET auth policies
        };

        var jwtSecret = _configuration["Jwt__Secret"]
                     ?? _configuration["Jwt:Secret"]
                     ?? throw new InvalidOperationException("JWT secret not configured");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"] ?? _configuration["Jwt__Issuer"] ?? "SMEFinancing",
            audience: _configuration["Jwt:Audience"] ?? _configuration["Jwt__Audience"] ?? "SMEFinancing",
            claims: claims,
            expires: DateTime.Now.AddHours(24),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
