using System.Numerics;
using Microsoft.Extensions.Options;
using Nethereum.ABI.FunctionEncoding.Attributes;
using Nethereum.Contracts;
using Nethereum.Hex.HexTypes;
using Nethereum.Util;
using Nethereum.Web3;
using Nethereum.Web3.Accounts;
using Nethereum.JsonRpc.Client;
using Nethereum.RPC.Eth.DTOs;

namespace Infrastructure.Blockchain;

/// <summary>
/// Provides blockchain integration for asset tokenization and loan lifecycle operations.
/// </summary>
public class BlockchainService : IBlockchainService
{
    private readonly ContractConfig _config;

    public BlockchainService(IOptions<ContractConfig> config)
    {
        _config = config.Value;
        ValidateConfiguration();
    }

    /// <inheritdoc />
    public async Task<string> TokenizeAssetAsync(string pmeWallet, string tokenURI, string assetType)
    {
        try
        {
            var web3 = CreateWeb3(pmeWallet);
            var contract = web3.Eth.GetContract(_config.AssetTokenAbi, _config.AssetTokenAddress);
            var function = contract.GetFunction("mint");
            var gas = await function.EstimateGasAsync(pmeWallet, tokenURI, assetType);
            return await function.SendTransactionAsync(pmeWallet, gas, null, pmeWallet, tokenURI, assetType);
        }
        catch (RpcResponseException ex)
        {
            throw new BlockchainException("Tokenization transaction failed.", ex);
        }
        catch (Exception ex)
        {
            throw new BlockchainException("Unexpected error during tokenization.", ex);
        }
    }

    /// <inheritdoc />
    public async Task<long> GetMintedTokenIdAsync(string txHash)
    {
        var web3 = new Web3(new RpcClient(new Uri(_config.RpcUrl)));

        TransactionReceipt? receipt = null;
        const int maxAttempts = 20;
        for (int i = 0; i < maxAttempts; i++)
        {
            receipt = await web3.Eth.Transactions.GetTransactionReceipt.SendRequestAsync(txHash);
            if (receipt != null) break;
            await Task.Delay(500);
        }

        if (receipt == null)
            throw new BlockchainException($"Transaction receipt not found for {txHash}");

        if (receipt.Status?.Value == 0)
            throw new BlockchainException($"Mint transaction {txHash} reverted on-chain");

        // Fetch logs via eth_getLogs — avoids receipt.Logs (MissingMethodException in Nethereum 6.1.0
        // caused by JArray/JToken signature conflict between Infrastructure and Api assemblies).
        var blockNum = (ulong)receipt.BlockNumber.Value;
        var filter = new NewFilterInput
        {
            FromBlock = new BlockParameter(blockNum),
            ToBlock = new BlockParameter(blockNum),
            Address = [_config.AssetTokenAddress]
        };

        var logs = await web3.Eth.Filters.GetLogs.SendRequestAsync(filter);

        var txLog = logs?.FirstOrDefault(l =>
            string.Equals(l.TransactionHash, txHash, StringComparison.OrdinalIgnoreCase) &&
            l.Topics?.Length >= 3);

        if (txLog is null)
            throw new BlockchainException(
                $"AssetTokenized event not found in logs for tx {txHash}. Block={blockNum}");

        // Event: AssetTokenized(address indexed owner, uint256 indexed tokenId, ...)
        // topics[0]=selector, topics[1]=owner, topics[2]=tokenId
        var tokenId = new HexBigInteger(txLog.Topics[2].ToString()).Value;
        return (long)tokenId;
    }

    /// <inheritdoc />
    public async Task<string> RequestLoanAsync(string pmeWallet, uint tokenId, decimal amount, uint durationDays)
    {
        try
        {
            var web3 = CreateWeb3(pmeWallet);
            var contract = web3.Eth.GetContract(_config.LoanManagerAbi, _config.LoanManagerAddress);
            var function = contract.GetFunction("requestLoan");
            var weiAmount = ConvertToWei(amount);
            var gas = await function.EstimateGasAsync(pmeWallet, tokenId, weiAmount, durationDays);
            return await function.SendTransactionAsync(pmeWallet, gas, null, tokenId, weiAmount, durationDays);
        }
        catch (RpcResponseException ex)
        {
            throw new BlockchainException("Loan request transaction failed.", ex);
        }
        catch (Exception ex)
        {
            throw new BlockchainException("Unexpected error during loan request.", ex);
        }
    }

    /// <inheritdoc />
    public async Task<string> GetAssetStatusAsync(uint tokenId)
    {
        try
        {
            var web3 = new Web3(new RpcClient(new Uri(_config.RpcUrl)));
            var contract = web3.Eth.GetContract(_config.AssetTokenAbi, _config.AssetTokenAddress);
            var function = contract.GetFunction("getAsset");
            var asset = await function.CallDeserializingToObjectAsync<AssetTokenOutputDto>(tokenId);
            return asset.Status switch
            {
                0 => "REGISTERED",
                1 => "ATO",
                2 => "COLLATERAL",
                3 => "LIQUIDATED",
                _ => asset.Status.ToString()
            };
        }
        catch (RpcResponseException ex)
        {
            throw new BlockchainException("Failed to retrieve asset status.", ex);
        }
        catch (Exception ex)
        {
            throw new BlockchainException("Unexpected error while retrieving asset status.", ex);
        }
    }

    /// <inheritdoc />
    public async Task<string> RegisterUserAsync(string walletAddress, string role)
    {
        try
        {
            var web3 = CreateWeb3ForGovernor();
            var contract = web3.Eth.GetContract(_config.RoleManagerAbi, _config.RoleManagerAddress);
            var function = contract.GetFunction("registerUser");

            // RoleManager.registerUser(address account, bytes32 role) — role must be keccak256 hash.
            var roleHex = new Sha3Keccack().CalculateHash(role);
            var roleBytes32 = Convert.FromHexString(roleHex);

            var gas = await function.EstimateGasAsync(_config.GovernorAddress, null, null, walletAddress, roleBytes32);
            return await function.SendTransactionAsync(_config.GovernorAddress, gas, null, walletAddress, roleBytes32);
        }
        catch (RpcResponseException ex)
        {
            throw new BlockchainException("RoleManager.registerUser transaction failed.", ex);
        }
        catch (Exception ex)
        {
            throw new BlockchainException("Unexpected error during governor approval blockchain call.", ex);
        }
    }

    /// <inheritdoc />
    public async Task GrantAssetTokenRoleAsync(string pmeWalletAddress)
    {
        try
        {
            var web3 = CreateWeb3ForGovernor();
            var contract = web3.Eth.GetContract(_config.AssetTokenAbi, _config.AssetTokenAddress);
            var function = contract.GetFunction("grantRole");

            // keccak256("PME") matches bytes32 constant PME = keccak256("PME") in AssetToken.sol.
            var roleHex = new Sha3Keccack().CalculateHash("PME");
            var pmeRoleBytes = Convert.FromHexString(roleHex);

            var gas = await function.EstimateGasAsync(_config.GovernorAddress, null, null, pmeRoleBytes, pmeWalletAddress);
            await function.SendTransactionAsync(_config.GovernorAddress, gas, null, pmeRoleBytes, pmeWalletAddress);
        }
        catch (BlockchainException)
        {
            throw;
        }
        catch (RpcResponseException ex)
        {
            throw new BlockchainException("AssetToken.grantRole(PME) failed.", ex);
        }
        catch (Exception ex)
        {
            throw new BlockchainException("Unexpected error during GrantAssetTokenRoleAsync.", ex);
        }
    }

    private Web3 CreateWeb3ForGovernor()
    {
        var privateKey = _config.GovernorPrivateKey;

        if (string.IsNullOrWhiteSpace(privateKey))
            privateKey = Environment.GetEnvironmentVariable("BLOCKFIN_GOVERNOR_PRIVATE_KEY");

        if (string.IsNullOrWhiteSpace(privateKey))
            throw new BlockchainException(
                "GovernorPrivateKey is not configured. " +
                "Set it in appsettings.Development.json or the BLOCKFIN_GOVERNOR_PRIVATE_KEY environment variable.");

        var account = new Account(privateKey);
        return new Web3(account, new RpcClient(new Uri(_config.RpcUrl)));
    }

    private Web3 CreateWeb3(string sender)
    {
        return new Web3(new RpcClient(new Uri(_config.RpcUrl)));
    }

    private static BigInteger ConvertToWei(decimal amount)
    {
        return Web3.Convert.ToWei(amount);
    }

    private void ValidateConfiguration()
    {
        var privateKey = _config.GovernorPrivateKey;
        if (string.IsNullOrWhiteSpace(privateKey))
            privateKey = Environment.GetEnvironmentVariable("BLOCKFIN_GOVERNOR_PRIVATE_KEY");

        if (string.IsNullOrWhiteSpace(_config.RpcUrl) ||
            string.IsNullOrWhiteSpace(_config.RoleManagerAddress) ||
            string.IsNullOrWhiteSpace(_config.AssetTokenAddress) ||
            string.IsNullOrWhiteSpace(_config.LoanManagerAddress) ||
            string.IsNullOrWhiteSpace(_config.AssetTokenAbi) ||
            string.IsNullOrWhiteSpace(_config.LoanManagerAbi) ||
            string.IsNullOrWhiteSpace(privateKey))
        {
            throw new BlockchainException(
                "Blockchain configuration is invalid or incomplete. " +
                "Check RpcUrl, contract addresses, and GovernorPrivateKey.");
        }
    }
}