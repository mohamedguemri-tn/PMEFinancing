using Application.Common.Models;
using MediatR;

namespace Application.Loans.Queries;

public class GetGuarantorLoansQuery : IRequest<PaginatedResult<LoanDto>>
{
    public string GuarantorWallet { get; set; } = string.Empty;
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}
