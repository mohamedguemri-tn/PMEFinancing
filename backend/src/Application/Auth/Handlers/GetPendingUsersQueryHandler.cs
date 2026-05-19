using System.Collections.Generic;
using System.Linq;
using Application.Auth.Commands;
using Application.Common.Models;
using Domain.Entities;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Auth.Handlers;

public class GetPendingUsersQueryHandler : IRequestHandler<GetPendingUsersQuery, PaginatedResult<PendingUserDto>>
{
    private readonly AppDbContext _context;

    public GetPendingUsersQueryHandler(AppDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedResult<PendingUserDto>> Handle(GetPendingUsersQuery request, CancellationToken cancellationToken)
    {
        var baseQuery = _context.Users
            .Where(u => !u.IsApproved)
            .OrderBy(u => u.CreatedAt);

        var totalCount = await baseQuery.CountAsync(cancellationToken);

        var users = await baseQuery
            .Include(u => u.PmeProfile)
            .Include(u => u.InvestorProfile)
            .Include(u => u.GuarantorProfile)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var items = users.Select(user => new PendingUserDto(
            user.Id,
            user.WalletAddress,
            user.Role.ToString(),
            BuildProfileData(user),
            user.CreatedAt)).ToList();

        return new PaginatedResult<PendingUserDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = request.Page,
            PageSize = request.PageSize
        };
    }

    private static IReadOnlyDictionary<string, string> BuildProfileData(User user)
    {
        return user.Role switch
        {
            Role.PME => new Dictionary<string, string>
            {
                { "companyName", user.PmeProfile?.CompanyName ?? string.Empty },
                { "email", user.PmeProfile?.Email ?? string.Empty },
                { "sector", user.PmeProfile?.Sector ?? string.Empty }
            },
            Role.INVESTOR => new Dictionary<string, string>
            {
                { "fullName", user.InvestorProfile?.FullName ?? string.Empty },
                { "email", user.InvestorProfile?.Email ?? string.Empty },
                { "investorType", user.InvestorProfile?.InvestorType ?? string.Empty }
            },
            Role.GUARANTOR => new Dictionary<string, string>
            {
                { "fullName", user.GuarantorProfile?.FullName ?? string.Empty },
                { "email", user.GuarantorProfile?.Email ?? string.Empty },
                { "organizationName", user.GuarantorProfile?.OrganizationName ?? string.Empty }
            },
            _ => new Dictionary<string, string>()
        };
    }
}
