namespace Infrastructure.Blockchain;

/// <summary>
/// Configuration for blockchain contract addresses and ABIs.
/// </summary>
public class ContractConfig
{
    public string RpcUrl { get; set; } = string.Empty;
    public string RoleManagerAddress { get; set; } = string.Empty;
    public string RoleManagerAbi { get; set; } = string.Empty;
    public string AssetTokenAddress { get; set; } = string.Empty;
    public string LoanManagerAddress { get; set; } = string.Empty;
    public string AssetTokenAbi { get; set; } = string.Empty;
    public string LoanManagerAbi { get; set; } = string.Empty;
    // Governor server-side signing (for grantRole on AssetToken at user approval time)
    public string GovernorPrivateKey { get; set; } = string.Empty;
    public string GovernorAddress { get; set; } = string.Empty;
}
