using System.ComponentModel.DataAnnotations;
using Application.Admin.Commands;
using Application.Admin.Queries;
using Application.Auth.Commands;
using Application.Loans.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "GOVERNOR")]
[Tags("Administration")]
public class AdminController : ControllerBase
{
    private readonly IMediator _mediator;

    public AdminController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>Get paginated list of users pending Governor approval.</summary>
    [HttpGet("users/pending")]
    public async Task<IActionResult> GetPendingUsers(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _mediator.Send(new GetPendingUsersQuery { Page = page, PageSize = pageSize });
        return Ok(result);
    }

    /// <summary>Get paginated list of all users with optional role and search filters.</summary>
    [HttpGet("users")]
    public async Task<IActionResult> GetAllUsers(
        [FromQuery] string? role,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _mediator.Send(new GetAllUsersQuery
        {
            Role = role,
            Search = search,
            Page = page,
            PageSize = pageSize
        });
        return Ok(result);
    }

    /// <summary>Soft-delete a user account. Cannot delete the Governor account.</summary>
    [HttpDelete("users/{id}")]
    public async Task<IActionResult> DeleteUser(Guid id)
    {
        try
        {
            await _mediator.Send(new DeleteUserCommand { UserId = id });
            return NoContent();
        }
        catch (Application.Common.Exceptions.ForbiddenActionException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new ProblemDetails { Title = ex.Message, Status = StatusCodes.Status403Forbidden, Detail = ex.Message });
        }
        catch (Application.Common.Exceptions.NotFoundException ex)
        {
            return NotFound(new ProblemDetails { Title = ex.Message, Status = StatusCodes.Status404NotFound, Detail = ex.Message });
        }
    }

    /// <summary>Get paginated list of overdue funded loans (DueDate has passed).</summary>
    [HttpGet("loans/overdue")]
    public async Task<IActionResult> GetOverdueLoans(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _mediator.Send(new GetOverdueLoansQuery { Page = page, PageSize = pageSize });
        return Ok(result);
    }

    /// <summary>Get real-time platform statistics (user counts, loan totals, asset counts).</summary>
    [HttpGet("stats")]
    public async Task<IActionResult> GetPlatformStats()
    {
        var stats = await _mediator.Send(new GetPlatformStatsQuery());
        return Ok(stats);
    }

    /// <summary>Get the last 10 platform activity events (loan requests, fundings, repayments, registrations).</summary>
    [HttpGet("activity")]
    public async Task<IActionResult> GetRecentActivity()
    {
        var activity = await _mediator.Send(new GetRecentActivityQuery());
        return Ok(activity);
    }

    /// <summary>Approve a pending user registration. Triggers on-chain role grant via the Governor wallet.</summary>
    [HttpPost("users/{id:guid}/approve")]
    public async Task<IActionResult> ApproveUser(Guid id)
    {
        try
        {
            var governorWallet = User.FindFirst("wallet")?.Value;
            if (string.IsNullOrWhiteSpace(governorWallet))
                throw new ValidationException("Governor wallet address is required");

            await _mediator.Send(new ApproveUserCommand
            {
                UserId = id,
                GovernorWalletAddress = governorWallet
            });

            return Ok(new { message = "User approved" });
        }
        catch (ValidationException ex)
        {
            return BadRequest(new ProblemDetails { Title = ex.Message, Status = StatusCodes.Status400BadRequest, Detail = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new ProblemDetails { Title = ex.Message, Status = StatusCodes.Status404NotFound, Detail = ex.Message });
        }
    }

    /// <summary>Reject and permanently delete a pending user registration.</summary>
    [HttpDelete("users/{id:guid}/reject")]
    public async Task<IActionResult> RejectUser(Guid id, [FromQuery] string reason = "")
    {
        try
        {
            await _mediator.Send(new RejectUserCommand { UserId = id, Reason = reason });
            return Ok(new { message = "User rejected" });
        }
        catch (ValidationException ex)
        {
            return BadRequest(new ProblemDetails { Title = ex.Message, Status = StatusCodes.Status400BadRequest, Detail = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new ProblemDetails { Title = ex.Message, Status = StatusCodes.Status404NotFound, Detail = ex.Message });
        }
    }
}
