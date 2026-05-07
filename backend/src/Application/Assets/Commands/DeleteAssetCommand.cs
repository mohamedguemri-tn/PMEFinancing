using MediatR;

namespace Application.Assets.Commands;

public class DeleteAssetCommand : IRequest
{
    public Guid Id { get; set; }
}
