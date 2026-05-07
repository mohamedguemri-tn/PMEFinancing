using Application.Loans.Commands;
using Application.Loans.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[Authorize]
[ApiController]
[Route("api/loans")]
public class LoansController : ControllerBase
{
    private readonly IMediator _mediator;

    public LoansController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<IActionResult> GetRequestedLoans()
    {
        var query = new GetRequestedLoansQuery();
        var result = await _mediator.Send(query);
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> RequestLoan(RequestLoanCommand command)
    {
        var id = await _mediator.Send(command);
        return CreatedAtAction(nameof(GetRequestedLoans), new { id }, new { id });
    }

    [HttpPost("{id}/fund")]
    public async Task<IActionResult> FundLoan(Guid id, FundLoanCommand command)
    {
        command.Id = id;
        await _mediator.Send(command);
        return NoContent();
    }

    [HttpPost("{id}/repay")]
    public async Task<IActionResult> RepayLoan(Guid id, RepayLoanCommand command)
    {
        command.Id = id;
        await _mediator.Send(command);
        return NoContent();
    }
}
