import { Transaction, SpendingAnalysis, IncomeAnalysis, AnalysisResult, TrendPoint } from '../types';

export const calculateSpendingAnalysis = (transactions: Transaction[]): SpendingAnalysis => {
  const expenses = transactions.filter(t => !t.isIncome && t.category !== 'Investment');
  const totalSpending = expenses.reduce((sum, t) => sum + Math.abs(t.money), 0);
  
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
  const income = transactions.filter(t => t.isIncome);
  const totalIncome = income.reduce((sum, t) => sum + t.money, 0);
  
  const weeklyIncomeIncrease = yearlySalary / 52;
  const monthlyIncomeIncrease = yearlySalary / 12;
  
  const totalSpending = transactions
    .filter(t => !t.isIncome && t.category !== 'Investment')
    .reduce((sum, t) => sum + Math.abs(t.money), 0);
  
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalSpending) / totalIncome) * 100 : 0;
  
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
  const expenses = transactions.filter(t => !t.isIncome && t.category !== 'Investment');
  const income = transactions.filter(t => t.isIncome);
  
  const totalSpending = expenses.reduce((sum, t) => sum + Math.abs(t.money), 0);
  const totalIncome = income.reduce((sum, t) => sum + t.money, 0);
  const netChange = totalIncome - totalSpending;
  
  const spendingAnalysis = calculateSpendingAnalysis(transactions);
  
  // Calculate spending by category
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
      color: getCategoryColor(name),
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

export const getCategoryColor = (categoryName: string): string => {
  const colors = [
    '#3B82F6', // blue
    '#EF4444', // red
    '#10B981', // green
    '#F59E0B', // yellow
    '#8B5CF6', // purple
    '#F97316', // orange
    '#06B6D4', // cyan
    '#84CC16', // lime
    '#EC4899', // pink
    '#6B7280', // gray
  ];
  
  // Simple hash function for consistent colors
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    const char = categoryName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return colors[Math.abs(hash) % colors.length];
};

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