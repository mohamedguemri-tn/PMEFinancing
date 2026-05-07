using MediatR;

namespace Application.Assets.Commands;

public class TokenizeAssetCommand : IRequest<string>
{
    public Guid Id { get; set; }
    public string TokenURI { get; set; } = string.Empty;
}
