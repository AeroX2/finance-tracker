import type { Transaction } from '../types';
import type { TimePeriod } from '../components/Analysis/TimePeriodSelector';

export const filterTransactionsByPeriod = (transactions: Transaction[], period: TimePeriod): Transaction[] => {
  if (period === 'all') {
    return transactions;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  let startDate: Date;
  
  switch (period) {
    case 'day':
      startDate = today;
      break;
    case 'week':
      const dayOfWeek = now.getDay();
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startDate = new Date(today.getTime() - daysFromMonday * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case '3months':
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      break;
    case '6months':
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      return transactions;
  }

  return transactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    return transactionDate >= startDate && transactionDate <= now;
  });
};

export const getPeriodLabel = (period: TimePeriod): string => {
  switch (period) {
    case 'all':
      return 'All Time';
    case 'day':
      return 'Today';
    case 'week':
      return 'This Week';
    case 'month':
      return 'This Month';
    case '3months':
      return 'Last 3 Months';
    case '6months':
      return 'Last 6 Months';
    case 'year':
      return 'This Year';
    default:
      return 'All Time';
  }
}; 