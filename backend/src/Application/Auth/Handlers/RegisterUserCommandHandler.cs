using System.ComponentModel.DataAnnotations;
using Application.Auth.Commands;
using Domain.Entities;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Nethereum.Signer;

namespace Application.Auth.Handlers;

public class RegisterUserCommandHandler : IRequestHandler<RegisterUserCommand, Guid>
{
    private readonly AppDbContext _context;

    public RegisterUserCommandHandler(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Guid> Handle(RegisterUserCommand request, CancellationToken cancellationToken)
    {
        var walletAddress = request.WalletAddress?.Trim();
        var signature = request.Signature?.Trim();
        var roleText = request.Role?.Trim();

        if (string.IsNullOrWhiteSpace(walletAddress))
            throw new ValidationException("Wallet address is required");

        if (string.IsNullOrWhiteSpace(signature))
            throw new ValidationException("Signature is required");

        if (string.IsNullOrWhiteSpace(roleText))
            throw new ValidationException("Role is required");

        if (!Enum.TryParse<Role>(roleText, true, out var role) || role == Role.GOVERNOR)
            throw new ValidationException("Role not allowed for self-registration");

        var userExists = await _context.Users
            .AnyAsync(u => u.WalletAddress == walletAddress, cancellationToken);

        if (userExists)
            throw new ValidationException("Wallet already registered");

        var utcNow = DateTime.UtcNow;
        var nonceRecord = await _context.Nonces
            .FirstOrDefaultAsync(n => n.WalletAddress == walletAddress, cancellationToken);

        if (nonceRecord == null || nonceRecord.ExpiresAt <= utcNow)
            throw new ValidationException("Invalid signature");

        var signer = new EthereumMessageSigner();
        var recoveredAddress = signer.EncodeUTF8AndEcRecover(nonceRecord.Value, signature);

        if (!string.Equals(recoveredAddress, walletAddress, StringComparison.OrdinalIgnoreCase))
            throw new ValidationException("Invalid signature");

        _context.Nonces.Remove(nonceRecord);

        var user = new User
        {
            WalletAddress = walletAddress,
            Role = role,
            IsApproved = false,
            CreatedAt = utcNow
        };

        switch (role)
        {
            case Role.PME:
                user.PmeProfile = new PmeProfile
                {
                    UserId = user.Id,
                    CompanyName = request.ProfileData.GetValueOrDefault("companyName", string.Empty),
                    Email = request.ProfileData.GetValueOrDefault("email", string.Empty),
                    Sector = request.ProfileData.GetValueOrDefault("sector", string.Empty)
                };
                if (string.IsNullOrWhiteSpace(user.PmeProfile.CompanyName) || string.IsNullOrWhiteSpace(user.PmeProfile.Email) || string.IsNullOrWhiteSpace(user.PmeProfile.Sector))
                    throw new ValidationException("Missing required PME profile fields");
                break;
            case Role.INVESTOR:
                user.InvestorProfile = new InvestorProfile
                {
                    UserId = user.Id,
                    FullName = request.ProfileData.GetValueOrDefault("fullName", string.Empty),
                    Email = request.ProfileData.GetValueOrDefault("email", string.Empty),
                    InvestorType = request.ProfileData.GetValueOrDefault("investorType", string.Empty)
                };
                if (string.IsNullOrWhiteSpace(user.InvestorProfile.FullName) || string.IsNullOrWhiteSpace(user.InvestorProfile.Email) || string.IsNullOrWhiteSpace(user.InvestorProfile.InvestorType))
                    throw new ValidationException("Missing required INVESTOR profile fields");
                break;
            case Role.GUARANTOR:
                user.GuarantorProfile = new GuarantorProfile
                {
                    UserId = user.Id,
                    FullName = request.ProfileData.GetValueOrDefault("fullName", string.Empty),
                    Email = request.ProfileData.GetValueOrDefault("email", string.Empty),
                    OrganizationName = request.ProfileData.GetValueOrDefault("organizationName", string.Empty)
                };
                if (string.IsNullOrWhiteSpace(user.GuarantorProfile.FullName) || string.IsNullOrWhiteSpace(user.GuarantorProfile.Email) || string.IsNullOrWhiteSpace(user.GuarantorProfile.OrganizationName))
                    throw new ValidationException("Missing required GUARANTOR profile fields");
                break;
        }

        _context.Users.Add(user);
        await _context.SaveChangesAsync(cancellationToken);
        return user.Id;
    }
}
