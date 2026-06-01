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
[Tags("Authentication")]
public class AuthController : ControllerBase
{
    private readonly IMediator _mediator;

    public AuthController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>Request a one-time nonce for wallet signature authentication.</summary>
    /// <remarks>The nonce expires after 10 minutes. Rate limited to 5 requests per minute per IP.</remarks>
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

    /// <summary>Register a new user account (PME, Investor, or Guarantor).</summary>
    /// <remarks>Account requires Governor approval before login is possible. Rate limited to 3 requests per 10 minutes per IP.</remarks>
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

    /// <summary>Authenticate using a wallet signature and receive a JWT token.</summary>
    /// <remarks>
    /// Sign the nonce from /nonce with MetaMask (personal_sign), then submit the signature here.
    /// Returns a 24-hour JWT token containing wallet, role, userId, and companyName claims.
    /// Rate limited to 10 requests per minute per IP.
    /// </remarks>
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

    /// <summary>Logout and invalidate the current JWT token.</summary>
    /// <remarks>Adds the token's JTI claim to the in-memory blocklist. Not rate limited.</remarks>
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
