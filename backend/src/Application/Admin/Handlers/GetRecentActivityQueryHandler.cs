using Application.Admin.Queries;
using Domain.Entities;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Admin.Handlers;

public class GetRecentActivityQueryHandler : IRequestHandler<GetRecentActivityQuery, List<ActivityDto>>
{
    private readonly AppDbContext _context;

    public GetRecentActivityQueryHandler(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ActivityDto>> Handle(GetRecentActivityQuery request, CancellationToken cancellationToken)
    {
        var recentLoans = await _context.Loans
            .Include(l => l.Pme).ThenInclude(p => p.PmeProfile)
            .Include(l => l.CollateralAsset)
            .Include(l => l.Investor)
            .OrderByDescending(l => l.UpdatedAt ?? l.CreatedAt)
            .Take(20)
            .ToListAsync(cancellationToken);

        var recentUsers = await _context.Users
            .OrderByDescending(u => u.CreatedAt)
            .Take(20)
            .ToListAsync(cancellationToken);

        var activities = new List<ActivityDto>();

        foreach (var loan in recentLoans)
        {
            var pmeWallet = loan.Pme.WalletAddress;
            var assetName = loan.CollateralAsset.Name;
            var pmeName = loan.Pme.PmeProfile?.CompanyName ?? FormatWallet(pmeWallet);

            switch (loan.Status)
            {
                case LoanStatus.REQUESTED:
                    activities.Add(new ActivityDto
                    {
                        Type = "LOAN_REQUESTED",
                        Description = $"{pmeName} requested a loan against {assetName}",
                        Timestamp = loan.CreatedAt,
                        WalletAddress = pmeWallet,
                    });
                    break;

                case LoanStatus.FUNDED when loan.FundedAt.HasValue:
                    var investorWallet = loan.Investor?.WalletAddress ?? string.Empty;
                    activities.Add(new ActivityDto
                    {
                        Type = "LOAN_FUNDED",
                        Description = $"{FormatWallet(investorWallet)} funded {pmeName} loan against {assetName}",
                        Timestamp = loan.FundedAt!.Value,
                        WalletAddress = investorWallet,
                    });
                    break;

                case LoanStatus.REPAID when loan.RepaidAt.HasValue:
                    activities.Add(new ActivityDto
                    {
                        Type = "LOAN_REPAID",
                        Description = $"{pmeName} repaid loan against {assetName}",
                        Timestamp = loan.RepaidAt!.Value,
                        WalletAddress = pmeWallet,
                    });
                    break;

                case LoanStatus.LIQUIDATED when loan.LiquidatedAt.HasValue:
                    activities.Add(new ActivityDto
                    {
                        Type = "LOAN_LIQUIDATED",
                        Description = $"{assetName} collateral liquidated for {pmeName} loan",
                        Timestamp = loan.LiquidatedAt!.Value,
                        WalletAddress = pmeWallet,
                    });
                    break;
            }
        }

        foreach (var user in recentUsers)
        {
            activities.Add(new ActivityDto
            {
                Type = "USER_REGISTERED",
                Description = $"{FormatWallet(user.WalletAddress)} registered as {user.Role}",
                Timestamp = user.CreatedAt,
                WalletAddress = user.WalletAddress,
            });
        }

        return activities
            .OrderByDescending(a => a.Timestamp)
            .Take(10)
            .ToList();
    }

    private static string FormatWallet(string wallet)
    {
        if (string.IsNullOrEmpty(wallet) || wallet.Length <= 10)
            return wallet;
        return $"{wallet[..6]}...{wallet[^4..]}";
    }
}
