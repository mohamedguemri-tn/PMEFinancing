using System.Numerics;
using Nethereum.ABI.FunctionEncoding.Attributes;
using Nethereum.Contracts;

namespace Infrastructure.Blockchain;

/// <summary>
/// DTO for decoding the AssetTokenized event emitted by AssetToken.sol:
///   event AssetTokenized(address indexed owner, uint256 indexed tokenId, string assetType, Status status)
/// </summary>
[Event("AssetTokenized")]
public class AssetTokenizedEventDto : IEventDTO
{
    [Parameter("address", "owner", 1, true)]
    public string Owner { get; set; } = string.Empty;

    [Parameter("uint256", "tokenId", 2, true)]
    public BigInteger TokenId { get; set; }

    [Parameter("string", "assetType", 3, false)]
    public string AssetType { get; set; } = string.Empty;

    [Parameter("uint8", "status", 4, false)]
    public byte Status { get; set; }
}