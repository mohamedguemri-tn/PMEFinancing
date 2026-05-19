using Application.Common.Exceptions;
using Application.Loans.Commands;
using Domain.Entities;
using Infrastructure.Blockchain;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Loans.Handlers;

public class RequestLoanCommandHandler : IRequestHandler<RequestLoanCommand, Guid>
{
    private readonly AppDbContext _context;
    private readonly IBlockchainService _blockchainService;

    public RequestLoanCommandHandler(AppDbContext context, IBlockchainService blockchainService)
    {
        _context = context;
        _blockchainService = blockchainService;
    }

    public async Task<Guid> Handle(RequestLoanCommand request, CancellationToken cancellationToken)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.WalletAddress == request.PmeWallet, cancellationToken);
        if (user == null) throw new Exception("User not found");

        var asset = await _context.Assets.FindAsync(request.CollateralAssetId, cancellationToken);
        if (asset == null) throw new Exception("Asset not found");

        if (asset.OwnerId != user.Id)
            throw new ForbiddenActionException("You do not own this asset");

        var loan = new Loan
        {
            PmeId = user.Id,
            CollateralAssetId = request.CollateralAssetId,
            RequestedAmount = request.RequestedAmount,
            Status = LoanStatus.REQUESTED,
            DurationDays = request.DurationDays,
            OnChainLoanId = request.OnChainLoanId,
        };

        _context.Loans.Add(loan);
        await _context.SaveChangesAsync(cancellationToken);

        return loan.Id;
    }
}
