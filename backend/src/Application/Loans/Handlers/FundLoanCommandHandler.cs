using Application.Common.Exceptions;
using Application.Loans.Commands;
using Domain.Entities;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Application.Loans.Handlers;

public class FundLoanCommandHandler : IRequestHandler<FundLoanCommand, Unit>
{
    private readonly AppDbContext _context;
    private readonly ILogger<FundLoanCommandHandler> _logger;

    public FundLoanCommandHandler(AppDbContext context, ILogger<FundLoanCommandHandler> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Unit> Handle(FundLoanCommand request, CancellationToken cancellationToken)
    {
        var loan = await _context.Loans.FindAsync(request.Id, cancellationToken);
        if (loan == null) throw new NotFoundException("Loan", request.Id);
        if (loan.Status != LoanStatus.REQUESTED)
            throw new ForbiddenActionException("Loan is not in REQUESTED state");

        var investor = await _context.Users.FirstOrDefaultAsync(u => u.WalletAddress == request.InvestorWallet, cancellationToken);
        if (investor == null) throw new NotFoundException("Investor", request.InvestorWallet);

        loan.InvestorId = investor.Id;
        loan.Status = LoanStatus.FUNDED;
        loan.FundedAt = DateTime.UtcNow;

        var collateralAsset = await _context.Assets.FindAsync(loan.CollateralAssetId, cancellationToken);
        if (collateralAsset != null)
            collateralAsset.Status = AssetStatus.COLLATERAL;

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Loan {LoanId} funded by investor {Wallet}; txHash={TxHash}",
            loan.Id, request.InvestorWallet, request.TransactionHash);

        return Unit.Value;
    }
}
