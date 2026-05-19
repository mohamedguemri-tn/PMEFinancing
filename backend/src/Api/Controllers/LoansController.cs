using Application.Loans.Commands;
using Application.Loans.Queries;
using Domain.Entities;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Api.Controllers;

[Authorize]
[ApiController]
[Route("api/loans")]
public class LoansController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly AppDbContext _context;

    public LoansController(IMediator mediator, AppDbContext context)
    {
        _mediator = mediator;
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetRequestedLoans(
        [FromQuery] string? pmeWallet,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _mediator.Send(new GetRequestedLoansQuery
        {
            PmeWallet = pmeWallet,
            Page = page,
            PageSize = pageSize
        });
        return Ok(result);
    }

    [HttpGet("active")]
    public async Task<IActionResult> GetActiveLoan([FromQuery] string pmeWallet)
    {
        var loan = await _context.Loans
            .Include(l => l.CollateralAsset)
            .Where(l => l.Pme.WalletAddress == pmeWallet && l.Status == LoanStatus.FUNDED)
            .Select(l => new
            {
                l.Id,
                amount = l.RequestedAmount,
                collateralName = l.CollateralAsset.Name,
                progress = 50,
                nextRepayment = l.FundedAt.HasValue
                    ? l.FundedAt.Value.AddDays(l.DurationDays).ToString("MMM d, yyyy")
                    : "N/A"
            })
            .FirstOrDefaultAsync();

        return Ok(loan);
    }

    [HttpPost]
    public async Task<IActionResult> RequestLoan(RequestLoanCommand command)
    {
        command.PmeWallet = User.FindFirst("wallet")?.Value ?? string.Empty;
        var id = await _mediator.Send(command);
        return CreatedAtAction(nameof(GetRequestedLoans), new { id }, new { id });
    }

    [HttpPost("{id}/fund")]
    public async Task<IActionResult> FundLoan(Guid id, FundLoanCommand command)
    {
        command.Id = id;
        command.InvestorWallet = User.FindFirst("wallet")?.Value ?? string.Empty;
        await _mediator.Send(command);
        return NoContent();
    }

    [HttpPost("{id}/repay")]
    public async Task<IActionResult> RepayLoan(Guid id, RepayLoanCommand command)
    {
        command.Id = id;
        command.PmeWallet = User.FindFirst("wallet")?.Value ?? string.Empty;
        await _mediator.Send(command);
        return NoContent();
    }

    [HttpGet("portfolio")]
    public async Task<IActionResult> GetPortfolio()
    {
        var wallet = User.FindFirst("wallet")?.Value;
        if (string.IsNullOrWhiteSpace(wallet))
            return Unauthorized();

        var investorId = await _context.Users
            .Where(u => u.WalletAddress == wallet)
            .Select(u => (Guid?)u.Id)
            .FirstOrDefaultAsync();

        if (investorId == null)
            return Ok(Array.Empty<object>());

        var loans = await _context.Loans
            .Include(l => l.Pme).ThenInclude(p => p.PmeProfile)
            .Where(l => l.InvestorId == investorId)
            .Select(l => new
            {
                id = l.Id,
                smeName = l.Pme.PmeProfile != null ? l.Pme.PmeProfile.CompanyName : l.Pme.WalletAddress,
                amount = l.RequestedAmount,
                date = l.FundedAt.HasValue ? l.FundedAt.Value.ToString("MMM d, yyyy") : l.CreatedAt.ToString("MMM d, yyyy"),
                status = l.Status.ToString()
            })
            .ToListAsync();

        return Ok(loans);
    }
}
