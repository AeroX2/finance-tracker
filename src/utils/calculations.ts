import { Transaction, SpendingAnalysis, IncomeAnalysis, AnalysisResult, TrendPoint } from '../types';
import { getCategoryColor as getColor } from '../config/categories';

// Transaction filtering utilities to consolidate conditional logic
export const isIncomeTransaction = (transaction: Transaction): boolean => {
  return transaction.isIncome || transaction.category === 'Income Offset';
};

export const isExpenseTransaction = (transaction: Transaction): boolean => {
  return !transaction.isIncome && transaction.category !== 'Investment' && transaction.category !== 'Income Offset';
};

export const isInvestmentTransaction = (transaction: Transaction): boolean => {
  return !transaction.isIncome && transaction.category === 'Investment';
};

export const isIncomeOffsetTransaction = (transaction: Transaction): boolean => {
  return transaction.category === 'Income Offset';
};

// Convenience functions for filtering transaction arrays
export const getIncomeTransactions = (transactions: Transaction[]): Transaction[] => {
  return transactions.filter(isIncomeTransaction);
};

export const getExpenseTransactions = (transactions: Transaction[]): Transaction[] => {
  return transactions.filter(isExpenseTransaction);
};

export const getInvestmentTransactions = (transactions: Transaction[]): Transaction[] => {
  return transactions.filter(isInvestmentTransaction);
};

export const getIncomeOffsetTransactions = (transactions: Transaction[]): Transaction[] => {
  return transactions.filter(isIncomeOffsetTransaction);
};

// Helper function to calculate income total (handles both regular income and income offset amounts)
export const calculateIncomeTotal = (incomeTransactions: Transaction[]): number => {
  return incomeTransactions.reduce((sum, t) => sum + (t.isIncome ? t.money : Math.abs(t.money)), 0);
};

// Helper function to calculate expense total
export const calculateExpenseTotal = (expenseTransactions: Transaction[]): number => {
  return expenseTransactions.reduce((sum, t) => sum + Math.abs(t.money), 0);
};

export const calculateSpendingAnalysis = (transactions: Transaction[]): SpendingAnalysis => {
  const expenses = getExpenseTransactions(transactions);
  
  // Calculate total spending (income offsets are now treated as income, not negative spending)
  const totalSpending = calculateExpenseTotal(expenses);
  
  if (expenses.length === 0) {
    return {
      dailyAverage: 0,
      weeklyAverage: 0,
      monthlyAverage: 0,
      yearlyAverage: 0,
      variance: 0,
      standardDeviation: 0,
    };
  }

  // Calculate date range
  const dates = expenses.map(t => new Date(t.date));
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
  const daysDiff = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const dailyAverage = totalSpending / daysDiff;
  const weeklyAverage = dailyAverage * 7;
  const monthlyAverage = dailyAverage * 30.44; // Average days per month
  const yearlyAverage = dailyAverage * 365.25; // Account for leap years

  // Calculate variance and standard deviation
  const mean = totalSpending / expenses.length;
  const variance = expenses.reduce((sum, t) => {
    const diff = Math.abs(t.money) - mean;
    return sum + (diff * diff);
  }, 0) / expenses.length;
  
  const standardDeviation = Math.sqrt(variance);

  return {
    dailyAverage,
    weeklyAverage,
    monthlyAverage,
    yearlyAverage,
    variance,
    standardDeviation,
  };
};

export const calculateIncomeAnalysis = (
  transactions: Transaction[], 
  yearlySalary: number
): IncomeAnalysis => {
  // Include all income sources, including income offsets
  const income = getIncomeTransactions(transactions);
  const totalIncome = calculateIncomeTotal(income);
  
  const weeklyIncomeIncrease = yearlySalary / 52;
  const monthlyIncomeIncrease = yearlySalary / 12;
  
  const totalSpending = calculateExpenseTotal(getExpenseTransactions(transactions));
  const totalInvestments = calculateExpenseTotal(getInvestmentTransactions(transactions));
  
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalSpending - totalInvestments) / totalIncome) * 100 : 0;
  
  // Calculate income trend (simple linear regression)
  const incomeTrend = calculateTrend(income);

  return {
    weeklyIncomeIncrease,
    monthlyIncomeIncrease,
    savingsRate,
    incomeTrend,
  };
};

export const calculateAnalysisResult = (
  transactions: Transaction[]
): AnalysisResult => {
  const expenses = getExpenseTransactions(transactions);
  const income = getIncomeTransactions(transactions);
  const investments = getInvestmentTransactions(transactions);
  
  // Calculate total spending, income, and investments properly
  const totalSpending = calculateExpenseTotal(expenses);
  const totalIncome = calculateIncomeTotal(income);
  const totalInvestments = calculateExpenseTotal(investments);
  const netChange = totalIncome - totalSpending - totalInvestments;
  
  const spendingAnalysis = calculateSpendingAnalysis(transactions);
  
  // Calculate spending by category (income offsets are now treated as income, not negative spending)
  const spendingByCategory: Record<string, number> = {};
  expenses.forEach(transaction => {
    const category = transaction.category || 'Uncategorized';
    spendingByCategory[category] = (spendingByCategory[category] || 0) + Math.abs(transaction.money);
  });
  
  // Get top categories
  const topCategories = Object.entries(spendingByCategory)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([name, amount]) => ({
      id: name,
      name,
      color: getColor(name),
      amount,
    }));
  
  // Calculate trend data
  const trendData = calculateTrendData(transactions);
  
  return {
    totalSpending,
    totalIncome,
    netChange,
    averageDailySpending: spendingAnalysis.dailyAverage,
    averageWeeklySpending: spendingAnalysis.weeklyAverage,
    averageMonthlySpending: spendingAnalysis.monthlyAverage,
    averageYearlySpending: spendingAnalysis.yearlyAverage,
    spendingByCategory,
    topCategories,
    trendData,
  };
};

export const calculateTrendData = (transactions: Transaction[]): TrendPoint[] => {
  // Sort transactions by date
  const sortedTransactions = [...transactions].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  const trendData: TrendPoint[] = [];
  let cumulative = 0;
  
  sortedTransactions.forEach(transaction => {
    cumulative += transaction.money;
    trendData.push({
      date: transaction.date,
      value: transaction.money,
      cumulative,
    });
  });
  
  return trendData;
};

export const calculateNetWorthTrendData = (transactions: Transaction[]): TrendPoint[] => {
  // Sort transactions by date
  const sortedTransactions = [...transactions].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  const trendData: TrendPoint[] = [];
  let cumulative = 0;
  
  sortedTransactions.forEach(transaction => {
    // For net worth calculation:
    // - Income and Income Offset: positive (increase net worth)
    // - Investments: positive (assets, increase net worth)
    // - Regular expenses: negative (decrease net worth)
    let netWorthValue = transaction.money;
    
    if (isInvestmentTransaction(transaction)) {
      // Investments are treated as positive for net worth (assets)
      netWorthValue = Math.abs(transaction.money);
    }
    
    cumulative += netWorthValue;
    trendData.push({
      date: transaction.date,
      value: netWorthValue,
      cumulative,
    });
  });
  
  return trendData;
};

export const calculateNetWorthBalanceAwareTrendData = (
  transactions: Transaction[], 
  currentBalance: number | null
): TrendPoint[] => {
  if (!currentBalance) {
    // Fall back to regular net worth trend data if no current balance
    return calculateNetWorthTrendData(transactions);
  }

  // Sort transactions by date
  const sortedTransactions = [...transactions].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  if (sortedTransactions.length === 0) {
    return [];
  }

  const trendData: TrendPoint[] = [];
  
  // Calculate the total net worth change from all transactions
  const totalNetWorthChange = sortedTransactions.reduce((sum, t) => {
    let netWorthValue = t.money;
    if (isInvestmentTransaction(t)) {
      netWorthValue = Math.abs(t.money);
    }
    return sum + netWorthValue;
  }, 0);
  
  // Starting net worth would be current balance minus all net worth changes
  let runningNetWorth = currentBalance - totalNetWorthChange;
  
  sortedTransactions.forEach(transaction => {
    let netWorthValue = transaction.money;
    if (isInvestmentTransaction(transaction)) {
      netWorthValue = Math.abs(transaction.money);
    }
    
    runningNetWorth += netWorthValue;
    trendData.push({
      date: transaction.date,
      value: netWorthValue,
      cumulative: runningNetWorth,
    });
  });
  
  return trendData;
};

export const calculateBalanceAwareTrendData = (
  transactions: Transaction[], 
  currentBalance: number | null
): TrendPoint[] => {
  if (!currentBalance) {
    // Fall back to regular trend data if no current balance
    return calculateTrendData(transactions);
  }

  // Sort transactions by date
  const sortedTransactions = [...transactions].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  if (sortedTransactions.length === 0) {
    return [];
  }

  const trendData: TrendPoint[] = [];
  
  // Calculate the total change from all transactions
  const totalTransactionChange = sortedTransactions.reduce((sum, t) => sum + t.money, 0);
  
  // Starting balance would be current balance minus all transaction changes
  let runningBalance = currentBalance - totalTransactionChange;
  
  sortedTransactions.forEach(transaction => {
    runningBalance += transaction.money;
    trendData.push({
      date: transaction.date,
      value: transaction.money,
      cumulative: runningBalance, // This now represents actual account balance
    });
  });
  
  return trendData;
};

export const calculateTrend = (transactions: Transaction[]): number => {
  if (transactions.length < 2) return 0;
  
  // Simple linear regression
  const sortedTransactions = [...transactions].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  const n = sortedTransactions.length;
  const xValues = sortedTransactions.map((_, index) => index);
  const yValues = sortedTransactions.map(t => t.money);
  
  const sumX = xValues.reduce((sum, x) => sum + x, 0);
  const sumY = yValues.reduce((sum, y) => sum + y, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  
  return slope;
};

// Re-export the getCategoryColor function from the categories config
export const getCategoryColor = getColor;

export const groupTransactionsByPeriod = (
  transactions: Transaction[], 
  period: 'day' | 'week' | 'month' | 'year'
): Record<string, Transaction[]> => {
  const grouped: Record<string, Transaction[]> = {};
  
  transactions.forEach(transaction => {
    const date = new Date(transaction.date);
    let key: string;
    
    switch (period) {
      case 'day':
        key = date.toISOString().split('T')[0];
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'year':
        key = date.getFullYear().toString();
        break;
    }
    
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(transaction);
  });
  
  return grouped;
};

export const calculateMovingAverage = (
  transactions: Transaction[], 
  windowSize: number = 7
): { date: string; average: number }[] => {
  const sortedTransactions = [...transactions].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  const movingAverages: { date: string; average: number }[] = [];
  
  for (let i = windowSize - 1; i < sortedTransactions.length; i++) {
    const window = sortedTransactions.slice(i - windowSize + 1, i + 1);
    const average = window.reduce((sum, t) => sum + Math.abs(t.money), 0) / windowSize;
    
    movingAverages.push({
      date: sortedTransactions[i].date,
      average,
    });
  }
  
  return movingAverages;
}; 