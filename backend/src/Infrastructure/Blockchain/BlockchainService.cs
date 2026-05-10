using System.Numerics;
using Microsoft.Extensions.Options;
using Nethereum.ABI.FunctionEncoding.Attributes;
using Nethereum.Contracts;
using Nethereum.Hex.HexTypes;
using Nethereum.Web3;
using Nethereum.JsonRpc.Client;

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
    public async Task<string> FundLoanAsync(string investorWallet, uint loanId, decimal amountEth)
    {
        try
        {
            var web3 = CreateWeb3(investorWallet);
            var contract = web3.Eth.GetContract(_config.LoanManagerAbi, _config.LoanManagerAddress);
            var function = contract.GetFunction("fundLoan");
            var value = new HexBigInteger(ConvertToWei(amountEth));
            var gas = await function.EstimateGasAsync(investorWallet, loanId);
            return await function.SendTransactionAsync(investorWallet, gas, value, loanId);
        }
        catch (RpcResponseException ex)
        {
            throw new BlockchainException("Loan funding transaction failed.", ex);
        }
        catch (Exception ex)
        {
            throw new BlockchainException("Unexpected error during loan funding.", ex);
        }
    }

    /// <inheritdoc />
    public async Task<string> RepayLoanAsync(string pmeWallet, uint loanId, decimal amountEth)
    {
        try
        {
            var web3 = CreateWeb3(pmeWallet);
            var contract = web3.Eth.GetContract(_config.LoanManagerAbi, _config.LoanManagerAddress);
            var function = contract.GetFunction("repayLoan");
            var value = new HexBigInteger(ConvertToWei(amountEth));
            var gas = await function.EstimateGasAsync(pmeWallet, loanId);
            return await function.SendTransactionAsync(pmeWallet, gas, value, loanId);
        }
        catch (RpcResponseException ex)
        {
            throw new BlockchainException("Loan repayment transaction failed.", ex);
        }
        catch (Exception ex)
        {
            throw new BlockchainException("Unexpected error during loan repayment.", ex);
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

    public async Task<string> RegisterUserAsync(string walletAddress, string role)
    {
        try
        {
            var web3 = CreateWeb3(walletAddress);
            var contract = web3.Eth.GetContract(_config.RoleManagerAbi, _config.RoleManagerAddress);
            var function = contract.GetFunction("registerUser");
            var gas = await function.EstimateGasAsync(walletAddress, walletAddress, role);
            return await function.SendTransactionAsync(walletAddress, gas, null, walletAddress, role);
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
        if (string.IsNullOrWhiteSpace(_config.RpcUrl) ||
            string.IsNullOrWhiteSpace(_config.RoleManagerAddress) ||
            string.IsNullOrWhiteSpace(_config.AssetTokenAddress) ||
            string.IsNullOrWhiteSpace(_config.LoanManagerAddress) ||
            string.IsNullOrWhiteSpace(_config.AssetTokenAbi) ||
            string.IsNullOrWhiteSpace(_config.LoanManagerAbi))
        {
            throw new BlockchainException("Blockchain configuration is invalid or incomplete.");
        }
    }
}
