using Application.Assets.Commands;
using Application.Assets.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[Authorize]
[ApiController]
[Route("api/assets")]
public class AssetsController : ControllerBase
{
    private readonly IMediator _mediator;

    public AssetsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<IActionResult> GetAssets([FromQuery] string pmeWallet)
    {
        var query = new GetAssetsByPmeWalletQuery { PmeWallet = pmeWallet };
        var result = await _mediator.Send(query);
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> CreateAsset(CreateAssetCommand command)
    {
        var id = await _mediator.Send(command);
        return CreatedAtAction(nameof(GetAssets), new { id }, new { id });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateAsset(Guid id, UpdateAssetCommand command)
    {
        command.Id = id;
        await _mediator.Send(command);
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAsset(Guid id)
    {
        var command = new DeleteAssetCommand { Id = id };
        await _mediator.Send(command);
        return NoContent();
    }

    [HttpPost("{id}/tokenize")]
    public async Task<IActionResult> TokenizeAsset(Guid id, TokenizeAssetCommand command)
    {
        command.Id = id;
        var txHash = await _mediator.Send(command);
        return Ok(new { transactionHash = txHash });
    }
}
