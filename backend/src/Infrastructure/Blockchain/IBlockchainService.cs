namespace Infrastructure.Blockchain;

/// <summary>
/// Blockchain service contract for asset tokenization and loan lifecycle operations.
/// </summary>
public interface IBlockchainService
{
    Task<string> TokenizeAssetAsync(string pmeWallet, string tokenURI, string assetType);
    Task<long> GetMintedTokenIdAsync(string txHash);
    Task<string> RequestLoanAsync(string pmeWallet, uint tokenId, decimal amount, uint durationDays);
    Task<string> GetAssetStatusAsync(uint tokenId);
    Task<string> RegisterUserAsync(string walletAddress, string role);
    Task GrantAssetTokenRoleAsync(string pmeWalletAddress);
    Task GrantLoanManagerRoleAsync(string walletAddress, string role);
}