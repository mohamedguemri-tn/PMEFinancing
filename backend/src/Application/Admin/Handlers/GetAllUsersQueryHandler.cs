using Application.Admin.Queries;
using Application.Common.Models;
using Domain.Entities;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Admin.Handlers;

public class GetAllUsersQueryHandler : IRequestHandler<GetAllUsersQuery, PaginatedResult<UserDto>>
{
    private readonly AppDbContext _context;

    public GetAllUsersQueryHandler(AppDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedResult<UserDto>> Handle(GetAllUsersQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Users
            .Include(u => u.PmeProfile)
            .Include(u => u.InvestorProfile)
            .Include(u => u.GuarantorProfile)
            .Where(u => !u.IsDeleted)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Role) &&
            Enum.TryParse<Role>(request.Role, true, out var roleEnum))
        {
            query = query.Where(u => u.Role == roleEnum);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.ToLower();
            query = query.Where(u =>
                u.WalletAddress.ToLower().Contains(search) ||
                (u.PmeProfile != null && u.PmeProfile.CompanyName.ToLower().Contains(search)) ||
                (u.InvestorProfile != null && u.InvestorProfile.FullName.ToLower().Contains(search)) ||
                (u.GuarantorProfile != null && u.GuarantorProfile.FullName.ToLower().Contains(search)));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var items = users.Select(u => new UserDto
        {
            Id = u.Id,
            WalletAddress = u.WalletAddress,
            Role = u.Role.ToString(),
            IsApproved = u.IsApproved,
            CreatedAt = u.CreatedAt,
            CompanyName = u.PmeProfile?.CompanyName
                       ?? u.InvestorProfile?.FullName
                       ?? u.GuarantorProfile?.FullName
        }).ToList();

        return new PaginatedResult<UserDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = request.Page,
            PageSize = request.PageSize
        };
    }
}
