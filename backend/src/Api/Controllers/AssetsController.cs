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
[Tags("Assets")]
public class AssetsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly AppDbContext _context;

    public AssetsController(IMediator mediator, AppDbContext context)
    {
        _mediator = mediator;
        _context = context;
    }

    /// <summary>Get paginated list of assets owned by a PME or Guarantor wallet.</summary>
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

    /// <summary>Create a new asset for a PME or Guarantor.</summary>
    /// <remarks>The wallet address is read from the JWT — do not pass pmeWallet in the body.</remarks>
    [HttpPost]
    public async Task<IActionResult> CreateAsset(CreateAssetCommand command)
    {
        command.PmeWallet = User.FindFirst("wallet")?.Value ?? string.Empty;
        var id = await _mediator.Send(command);
        return CreatedAtAction(nameof(GetAssets), new { id }, new { id });
    }

    /// <summary>Update an existing asset. Only the asset owner can update.</summary>
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

    /// <summary>Delete an asset. Only the asset owner can delete.</summary>
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

    /// <summary>Record a completed on-chain tokenization. MetaMask must call AssetToken.mint() first.</summary>
    /// <remarks>
    /// The frontend calls mint() via MetaMask, waits for the receipt, parses the AssetTokenized event
    /// to get the tokenId, then calls this endpoint with { transactionHash, tokenId }.
    /// The backend only records the result — it never calls the blockchain directly for this action.
    /// </remarks>
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
