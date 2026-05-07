namespace Infrastructure.Blockchain;

/// <summary>
/// Configuration for blockchain contract addresses and ABIs.
/// </summary>
public class ContractConfig
{
    public string RpcUrl { get; set; } = string.Empty;
    public string RoleManagerAddress { get; set; } = string.Empty;
    public string AssetTokenAddress { get; set; } = string.Empty;
    public string LoanManagerAddress { get; set; } = string.Empty;
    public string AssetTokenAbi { get; set; } = string.Empty;
    public string LoanManagerAbi { get; set; } = string.Empty;
}
