using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Application.Auth.Commands;
using Domain.Entities;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Nethereum.Signer;

namespace Application.Auth.Handlers;

public class LoginCommandHandler : IRequestHandler<LoginCommand, string>
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;

    public LoginCommandHandler(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    public async Task<string> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var walletAddress = request.WalletAddress?.Trim();
        var signature = request.Signature?.Trim();

        if (string.IsNullOrWhiteSpace(walletAddress))
            throw new ValidationException("Wallet address is required");

        if (string.IsNullOrWhiteSpace(signature))
            throw new ValidationException("Signature is required");

        var utcNow = DateTime.UtcNow;
        var nonceRecord = await _context.Nonces
            .FirstOrDefaultAsync(n => n.WalletAddress == walletAddress, cancellationToken);

        if (nonceRecord == null || nonceRecord.ExpiresAt <= utcNow)
            throw new ValidationException("Invalid signature");

        var signer = new EthereumMessageSigner();
        var recoveredAddress = signer.EncodeUTF8AndEcRecover(nonceRecord.Value, signature);
        if (!string.Equals(recoveredAddress, walletAddress, StringComparison.OrdinalIgnoreCase))
            throw new ValidationException("Invalid signature");

        var user = await _context.Users
            .Include(u => u.PmeProfile)
            .Include(u => u.InvestorProfile)
            .FirstOrDefaultAsync(u => u.WalletAddress == walletAddress, cancellationToken);

        if (user == null)
            throw new KeyNotFoundException("User not found");

        if (!user.IsApproved)
            throw new UnauthorizedAccessException("Account pending approval");

        _context.Nonces.Remove(nonceRecord);
        await _context.SaveChangesAsync(cancellationToken);

        var jwtSecret = _configuration["Jwt:Secret"];
        var jwtIssuer = _configuration["Jwt:Issuer"];
        var jwtAudience = _configuration["Jwt:Audience"];

        if (string.IsNullOrWhiteSpace(jwtSecret) || string.IsNullOrWhiteSpace(jwtIssuer) || string.IsNullOrWhiteSpace(jwtAudience))
            throw new InvalidOperationException("JWT configuration is incomplete");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var jti = Guid.NewGuid().ToString();

        var claims = new List<Claim>
        {
            new Claim("wallet", walletAddress),
            new Claim("role", user.Role.ToString()),
            new Claim("userId", user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, jti),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim("companyName", user.PmeProfile?.CompanyName ?? user.InvestorProfile?.FullName ?? string.Empty)
        };

        var token = new JwtSecurityToken(
            issuer: jwtIssuer,
            audience: jwtAudience,
            claims: claims,
            expires: utcNow.AddHours(24),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
