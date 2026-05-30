using Application.Common.Interfaces;
using Api.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace Api.Services;

public class NotificationService : INotificationService
{
    private readonly IHubContext<NotificationHub> _hubContext;

    public NotificationService(IHubContext<NotificationHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task SendToUserAsync(string walletAddress, string type, string message)
    {
        await _hubContext.Clients
            .Group(walletAddress.ToLower())
            .SendAsync("ReceiveNotification", new
            {
                type,
                message,
                timestamp = DateTime.UtcNow,
                isRead = false,
            });
    }

    public async Task SendToRoleAsync(string role, string type, string message)
    {
        await _hubContext.Clients
            .Group($"role_{role.ToLower()}")
            .SendAsync("ReceiveNotification", new
            {
                type,
                message,
                timestamp = DateTime.UtcNow,
                isRead = false,
            });
    }
}
