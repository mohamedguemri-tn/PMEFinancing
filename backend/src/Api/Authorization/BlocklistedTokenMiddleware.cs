using System.IdentityModel.Tokens.Jwt;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;

namespace Api.Authorization;

public class BlocklistedTokenMiddleware
{
    private readonly RequestDelegate _next;

    public BlocklistedTokenMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, AppDbContext dbContext)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var jti = context.User.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;
            if (!string.IsNullOrWhiteSpace(jti))
            {
                var blocked = await dbContext.BlocklistedTokens
                    .AnyAsync(t => t.Jti == jti, context.RequestAborted);

                if (blocked)
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    await context.Response.WriteAsJsonAsync(new ProblemDetails
                    {
                        Title = "Token revoked",
                        Status = StatusCodes.Status401Unauthorized,
                        Detail = "This token has been logged out and is no longer valid."
                    });
                    return;
                }
            }
        }

        await _next(context);
    }
}
