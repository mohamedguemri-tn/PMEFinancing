using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ApplicationModels;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace Api.Controllers;

/// <summary>
/// DEBUG ONLY — This controller must never be reachable in production.
/// It exposes: full DB reset, JWT generation without authentication, raw state dump.
/// Protected by: (1) IsDev guard inside each action, (2) /api/debug/* blocked in Program.cs for non-Development.
/// To fully remove from production binary: move to a separate test-only project.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class DebugController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly TestDataSeeder _testDataSeeder;
    private readonly IHostEnvironment _env;

    public DebugController(
        AppDbContext context, 
        IConfiguration configuration, 
        TestDataSeeder testDataSeeder,
        IHostEnvironment env)
    {
        _context = context;
        _configuration = configuration;
        _testDataSeeder = testDataSeeder;
        _env = env;
    }

    private bool IsDev => _env.IsDevelopment();

    [HttpGet("token/{role}")]
    public async Task<IActionResult> GetToken(string role)
    {
        if (!IsDev) return NotFound();

        if (!Enum.TryParse<Role>(role, true, out var roleEnum))
        {
            return BadRequest(new { message = "Invalid role" });
        }

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Role == roleEnum && u.IsApproved);

        if (user == null)
        {
            return NotFound(new { message = $"No approved user found with role: {roleEnum}" });
        }

        var jwtSecret = _configuration["Jwt:Secret"];
        var jwtIssuer = _configuration["Jwt:Issuer"];
        var jwtAudience = _configuration["Jwt:Audience"];

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var utcNow = DateTime.UtcNow;
        var expiresAt = utcNow.AddHours(24);

        var claims = new List<Claim>
        {
            new Claim("wallet", user.WalletAddress),
            new Claim("role", user.Role.ToString()),
            new Claim("userId", user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Role, user.Role.ToString())
        };

        var token = new JwtSecurityToken(
            issuer: jwtIssuer,
            audience: jwtAudience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: creds);

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

        return Ok(new
        {
            token = tokenString,
            walletAddress = user.WalletAddress,
            role = user.Role.ToString(),
            userId = user.Id,
            expiresAt
        });
    }

    [HttpGet("state")]
    public async Task<IActionResult> GetState()
    {
        if (!IsDev) return NotFound();

        var users = await _context.Users
            .Select(u => new { u.Id, u.WalletAddress, u.Role, u.IsApproved })
            .ToListAsync();

        var assets = await _context.Assets
            .Select(a => new { a.Id, a.Name, a.Status, a.TokenId, OwnerWallet = a.Owner.WalletAddress })
            .ToListAsync();

        var loans = await _context.Loans
            .Select(l => new { l.Id, l.RequestedAmount, l.Status, PmeWallet = l.Pme.WalletAddress, InvestorWallet = l.Investor != null ? l.Investor.WalletAddress : null })
            .ToListAsync();

        var blocklistedCount = await _context.BlocklistedTokens.CountAsync();
        var pendingNoncesCount = await _context.Nonces.CountAsync();

        return Ok(new
        {
            users,
            assets,
            loans,
            blocklistedTokens = blocklistedCount,
            pendingNonces = pendingNoncesCount
        });
    }

    [HttpDelete("reset")]
    public async Task<IActionResult> Reset()
    {
        if (!IsDev) return NotFound();

        // Remove all data including all governors so stale rows can't accumulate
        _context.Loans.RemoveRange(_context.Loans);
        _context.Assets.RemoveRange(_context.Assets);
        _context.Nonces.RemoveRange(_context.Nonces);
        _context.BlocklistedTokens.RemoveRange(_context.BlocklistedTokens);
        await _context.SaveChangesAsync();

        _context.Users.RemoveRange(_context.Users);
        await _context.SaveChangesAsync();

        // Re-seed from scratch with current config values
        await _testDataSeeder.SeedAsync();

        return Ok(new { message = "Full reset successful — all users removed and re-seeded" });
    }
}

public class DebugControllerConvention : IControllerModelConvention
{
    private readonly IHostEnvironment _env;

    public DebugControllerConvention(IHostEnvironment env)
    {
        _env = env;
    }

    public void Apply(ControllerModel controller)
    {
        if (controller.ControllerName == "Debug" && !_env.IsDevelopment())
        {
            controller.ApiExplorer.IsVisible = false;
        }
    }
}
