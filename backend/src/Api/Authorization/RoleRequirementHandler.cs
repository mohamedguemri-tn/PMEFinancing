using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace Api.Authorization;

public class RoleRequirementHandler : AuthorizationHandler<RoleRequirement>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, RoleRequirement requirement)
{
    Console.WriteLine($"IsAuthenticated: {context.User.Identity?.IsAuthenticated}");
    Console.WriteLine($"Claims: {string.Join(", ", context.User.Claims.Select(c => $"{c.Type}={c.Value}"))}");
    
    var roleClaim = context.User.FindFirst(ClaimTypes.Role)?.Value;
    Console.WriteLine($"RoleClaim: {roleClaim}, Required: {requirement.Role}");
    
    if (roleClaim == requirement.Role)
        context.Succeed(requirement);

    return Task.CompletedTask;
}
}
