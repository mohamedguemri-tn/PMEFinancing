using Nethereum.ABI.FunctionEncoding.Attributes;

namespace Infrastructure.Blockchain;

[FunctionOutput]
public class AssetTokenOutputDto : IFunctionOutputDTO
{
    [Parameter("string", "assetType", 1)]
    public string AssetType { get; set; } = string.Empty;

    [Parameter("uint8", "status", 2)]
    public byte Status { get; set; }

    [Parameter("string", "uri", 3)]
    public string Uri { get; set; } = string.Empty;

    [Parameter("address", "owner", 4)]
    public string Owner { get; set; } = string.Empty;
}
