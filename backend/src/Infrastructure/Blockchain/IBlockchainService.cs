namespace Infrastructure.Blockchain;

/// <summary>
/// Blockchain service contract for asset tokenization and loan lifecycle operations.
/// </summary>
public interface IBlockchainService
{
    Task<string> TokenizeAssetAsync(string pmeWallet, string tokenURI, string assetType);
    Task<string> RequestLoanAsync(string pmeWallet, uint tokenId, decimal amount, uint durationDays);
    Task<string> FundLoanAsync(string investorWallet, uint loanId, decimal amountEth);
    Task<string> RepayLoanAsync(string pmeWallet, uint loanId, decimal amountEth);
    Task<string> GetAssetStatusAsync(uint tokenId);
    Task<string> RegisterUserAsync(string walletAddress, string role);
}
