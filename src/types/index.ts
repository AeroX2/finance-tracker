export interface PayPalData {
  name: string;
  type: string;
  transactionId: string;
  receiptId: string;
  itemTitle: string;
  confidence: number;
  reason: string;
}

export interface Transaction {
  id: string;
  date: string;
  money: number;
  description: string;
  category?: string;
  isIncome: boolean;
  paypalData?: PayPalData;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

export interface AnalysisResult {
  totalSpending: number;
  totalIncome: number;
  netChange: number;
  averageDailySpending: number;
  averageWeeklySpending: number;
  averageMonthlySpending: number;
  averageYearlySpending: number;
  spendingByCategory: Record<string, number>;
  topCategories: Category[];
  trendData: TrendPoint[];
}

export interface TrendPoint {
  date: string;
  value: number;
  cumulative: number;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    borderWidth?: number;
  }[];
}

export interface AppState {
  transactions: Transaction[];
  currentBalance: number | null;
  yearlySalary: number | null;
  categories: Category[];
  isLoading: boolean;
  error: string | null;
}

export interface CSVRow {
  date: string;
  money: string;
  description: string;
}

export interface SpendingAnalysis {
  dailyAverage: number;
  weeklyAverage: number;
  monthlyAverage: number;
  yearlyAverage: number;
  variance: number;
  standardDeviation: number;
}

export interface IncomeAnalysis {
  weeklyIncomeIncrease: number;
  monthlyIncomeIncrease: number;
  savingsRate: number;
  incomeTrend: number;
} 