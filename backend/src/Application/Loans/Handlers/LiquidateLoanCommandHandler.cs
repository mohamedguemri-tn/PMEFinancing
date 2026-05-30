using Application.Common.Exceptions;
using Application.Loans.Commands;
using Domain.Entities;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Application.Loans.Handlers;

public class LiquidateLoanCommandHandler : IRequestHandler<LiquidateLoanCommand, Unit>
{
    private readonly AppDbContext _context;
    private readonly ILogger<LiquidateLoanCommandHandler> _logger;

    public LiquidateLoanCommandHandler(AppDbContext context, ILogger<LiquidateLoanCommandHandler> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Unit> Handle(LiquidateLoanCommand request, CancellationToken cancellationToken)
    {
        var loan = await _context.Loans
            .Include(l => l.CollateralAsset)
            .Include(l => l.Investor)
            .FirstOrDefaultAsync(l => l.Id == request.Id, cancellationToken);

        if (loan == null)
            throw new NotFoundException("Loan", request.Id);

        if (loan.Status != LoanStatus.FUNDED)
            throw new ForbiddenActionException("Only FUNDED loans can be liquidated");

        if (!loan.DueDate.HasValue || loan.DueDate.Value > DateTime.UtcNow)
            throw new ForbiddenActionException("Loan is not yet overdue");

        loan.Status = LoanStatus.LIQUIDATED;
        loan.LiquidatedAt = DateTime.UtcNow;

        if (loan.CollateralAsset != null)
            loan.CollateralAsset.Status = AssetStatus.LIQUIDATED;

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Loan {LoanId} liquidated; txHash={TxHash}", loan.Id, request.TransactionHash);

        return Unit.Value;
    }
}
