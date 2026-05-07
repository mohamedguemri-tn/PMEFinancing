using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace Api.Authorization;

public class RoleRequirementHandler : AuthorizationHandler<RoleRequirement>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, RoleRequirement requirement)
    {
        var roleClaim = context.User.FindFirst(ClaimTypes.Role)?.Value;
        if (roleClaim == requirement.Role)
        {
            context.Succeed(requirement);
        }
        return Task.CompletedTask;
    }
}
