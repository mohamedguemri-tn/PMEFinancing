namespace Infrastructure.Blockchain;

/// <summary>
/// Exception type used for blockchain integration failures.
/// </summary>
public class BlockchainException : Exception
{
    public BlockchainException(string message)
        : base(message)
    {
    }

    public BlockchainException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}
