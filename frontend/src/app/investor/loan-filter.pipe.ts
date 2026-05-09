import { Pipe, PipeTransform } from '@angular/core';
import { Loan } from './investor-loans.component';

@Pipe({
  name: 'loanFilter',
  standalone: true,
})
export class LoanFilterPipe implements PipeTransform {
  transform(loans: Loan[] | null, status: string): Loan[] {
    if (!loans) return [];
    return loans.filter(loan => loan.status === status);
  }
}