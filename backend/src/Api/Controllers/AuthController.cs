using Application.Auth.Commands;
using MediatR;
using Microsoft.AspNetCore.Mvc;

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
    public async Task<IActionResult> GetNonce(GetNonceCommand command)
    {
        var nonce = await _mediator.Send(command);
        return Ok(new { nonce });
    }

    [HttpPost("verify")]
    public async Task<IActionResult> VerifySignature(VerifySignatureCommand command)
    {
        var token = await _mediator.Send(command);
        return Ok(new { token });
    }
}
