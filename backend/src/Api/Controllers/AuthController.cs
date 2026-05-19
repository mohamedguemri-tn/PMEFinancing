using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using Application.Auth.Commands;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IMediator _mediator;

    public AuthController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost("nonce")]
    [EnableRateLimiting(RateLimitPolicies.Nonce)]
    public async Task<IActionResult> GetNonce([FromBody] GetOrCreateNonceQuery query)
    {
        try
        {
            var nonce = await _mediator.Send(query);
            return Ok(new { nonce });
        }
        catch (ValidationException ex)
        {
            return BadRequest(new ProblemDetails { Title = ex.Message, Status = StatusCodes.Status400BadRequest, Detail = ex.Message });
        }
    }

    [HttpPost("register")]
    [EnableRateLimiting(RateLimitPolicies.Register)]
    public async Task<IActionResult> Register([FromBody] RegisterUserCommand command)
    {
        try
        {
            await _mediator.Send(command);
            return Created(string.Empty, new { message = "Registration submitted, awaiting approval" });
        }
        catch (ValidationException ex)
        {
            return BadRequest(new ProblemDetails { Title = ex.Message, Status = StatusCodes.Status400BadRequest, Detail = ex.Message });
        }
    }

    [HttpPost("login")]
    [EnableRateLimiting(RateLimitPolicies.Login)]
    public async Task<IActionResult> Login([FromBody] LoginCommand command)
    {
        try
        {
            var token = await _mediator.Send(command);
            return Ok(new { token });
        }
        catch (ValidationException ex)
        {
            return BadRequest(new ProblemDetails { Title = ex.Message, Status = StatusCodes.Status400BadRequest, Detail = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new ProblemDetails { Title = ex.Message, Status = StatusCodes.Status404NotFound, Detail = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new ProblemDetails { Title = ex.Message, Status = StatusCodes.Status401Unauthorized, Detail = ex.Message });
        }
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        try
        {
            var jti = User.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;
            var expClaim = User.FindFirst(JwtRegisteredClaimNames.Exp)?.Value;

            if (string.IsNullOrWhiteSpace(jti) || string.IsNullOrWhiteSpace(expClaim))
                throw new ValidationException("Invalid token claims");

            if (!long.TryParse(expClaim, out var expSeconds))
                throw new ValidationException("Invalid token expiration value");

            var expiry = DateTimeOffset.FromUnixTimeSeconds(expSeconds).UtcDateTime;
            await _mediator.Send(new LogoutCommand { Jti = jti, TokenExpiry = expiry });
            return Ok(new { message = "Logged out" });
        }
        catch (ValidationException ex)
        {
            return BadRequest(new ProblemDetails { Title = ex.Message, Status = StatusCodes.Status400BadRequest, Detail = ex.Message });
        }
    }
}
