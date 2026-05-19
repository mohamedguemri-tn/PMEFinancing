using Application.Assets.Commands;
using Application.Assets.Queries;
using Infrastructure.Persistence;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Api.Controllers;

[Authorize]
[ApiController]
[Route("api/assets")]
public class AssetsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly AppDbContext _context;

    public AssetsController(IMediator mediator, AppDbContext context)
    {
        _mediator = mediator;
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAssets(
        [FromQuery] string pmeWallet,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _mediator.Send(new GetAssetsByPmeWalletQuery
        {
            PmeWallet = pmeWallet,
            Page = page,
            PageSize = pageSize
        });
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> CreateAsset(CreateAssetCommand command)
    {
        command.PmeWallet = User.FindFirst("wallet")?.Value ?? string.Empty;
        var id = await _mediator.Send(command);
        return CreatedAtAction(nameof(GetAssets), new { id }, new { id });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateAsset(Guid id, UpdateAssetCommand command)
    {
        var wallet = User.FindFirst("wallet")?.Value;
        if (string.IsNullOrWhiteSpace(wallet))
            return Unauthorized();

        var asset = await _context.Assets
            .Include(a => a.Owner)
            .FirstOrDefaultAsync(a => a.Id == id);
        if (asset == null)
            return NotFound();
        if (!string.Equals(asset.Owner.WalletAddress, wallet, StringComparison.OrdinalIgnoreCase))
            return Forbid();

        command.Id = id;
        await _mediator.Send(command);
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAsset(Guid id)
    {
        var wallet = User.FindFirst("wallet")?.Value;
        if (string.IsNullOrWhiteSpace(wallet))
            return Unauthorized();

        var asset = await _context.Assets
            .Include(a => a.Owner)
            .FirstOrDefaultAsync(a => a.Id == id);
        if (asset == null)
            return NotFound();
        if (!string.Equals(asset.Owner.WalletAddress, wallet, StringComparison.OrdinalIgnoreCase))
            return Forbid();

        var command = new DeleteAssetCommand { Id = id };
        await _mediator.Send(command);
        return NoContent();
    }

    [HttpPost("{id}/tokenize")]
    public async Task<IActionResult> TokenizeAsset(Guid id, TokenizeAssetCommand command)
    {
        var wallet = User.FindFirst("wallet")?.Value;
        if (string.IsNullOrWhiteSpace(wallet))
            return Unauthorized();

        var asset = await _context.Assets
            .Include(a => a.Owner)
            .FirstOrDefaultAsync(a => a.Id == id);
        if (asset == null)
            return NotFound();
        if (!string.Equals(asset.Owner.WalletAddress, wallet, StringComparison.OrdinalIgnoreCase))
            return Forbid();

        command.Id = id;
        command.PmeWallet = wallet;
        var txHash = await _mediator.Send(command);
        return Ok(new { transactionHash = txHash });
    }
}
