using Application.Common.Models;
using MediatR;

namespace Application.Loans.Queries;

public class GetOverdueLoansQuery : IRequest<PaginatedResult<OverdueLoanDto>>
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}

public class OverdueLoanDto
{
    public Guid Id { get; set; }
    public string PmeName { get; set; } = string.Empty;
    public string AssetName { get; set; } = string.Empty;
    public decimal RequestedAmount { get; set; }
    public DateTime DueDate { get; set; }
    public int DaysOverdue { get; set; }
    public string? InvestorWallet { get; set; }
    public long? OnChainLoanId { get; set; }
}
