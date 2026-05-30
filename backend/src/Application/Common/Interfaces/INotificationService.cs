namespace Application.Common.Interfaces;

public interface INotificationService
{
    /// <summary>Send a notification to a specific wallet address.</summary>
    Task SendToUserAsync(string walletAddress, string type, string message);

    /// <summary>Send a notification to all connected users with a specific role.</summary>
    Task SendToRoleAsync(string role, string type, string message);
}
