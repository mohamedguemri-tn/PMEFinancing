using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace Api.Hubs;

[Authorize]
public class NotificationHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var wallet = Context.User?.FindFirst("wallet")?.Value;
        if (!string.IsNullOrEmpty(wallet))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, wallet.ToLower());
        }

        // ClaimTypes.Role serialises as a long URI; also accept the short "role" name.
        var role = Context.User?.FindFirst("role")?.Value
                ?? Context.User?.FindFirst(ClaimTypes.Role)?.Value;
        if (!string.IsNullOrEmpty(role))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"role_{role.ToLower()}");
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var wallet = Context.User?.FindFirst("wallet")?.Value;
        if (!string.IsNullOrEmpty(wallet))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, wallet.ToLower());
        }

        var role = Context.User?.FindFirst("role")?.Value
                ?? Context.User?.FindFirst(ClaimTypes.Role)?.Value;
        if (!string.IsNullOrEmpty(role))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"role_{role.ToLower()}");
        }

        await base.OnDisconnectedAsync(exception);
    }
}
