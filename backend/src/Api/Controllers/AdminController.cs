using System.ComponentModel.DataAnnotations;
using Application.Auth.Commands;
using Domain.Entities;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "GOVERNOR")]
public class AdminController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly AppDbContext _context;

    public AdminController(IMediator mediator, AppDbContext context)
    {
        _mediator = mediator;
        _context = context;
    }

    [HttpGet("users/pending")]
    public async Task<IActionResult> GetPendingUsers(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _mediator.Send(new GetPendingUsersQuery { Page = page, PageSize = pageSize });
        return Ok(result);
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetAllUsers()
    {
        var users = await _context.Users
            .Where(u => u.IsApproved && u.Role != Role.GOVERNOR)
            .Select(u => new { u.Id, u.WalletAddress, Role = u.Role.ToString(), u.CreatedAt })
            .ToListAsync();
        return Ok(users);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var totalUsers = await _context.Users.CountAsync(u => u.IsApproved && u.Role != Role.GOVERNOR);
        var pendingApprovals = await _context.Users.CountAsync(u => !u.IsApproved);
        var activeLoans = await _context.Loans.CountAsync(l => l.Status == LoanStatus.FUNDED);
        var platformTvl = await _context.Assets.SumAsync(a => (decimal?)a.EstimatedValue) ?? 0;

        return Ok(new { totalUsers, pendingApprovals, activeLoans, platformTvl });
    }

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
