import React from 'react';
import { TrendingDown, Calendar, DollarSign, BarChart3, TrendingUp } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { calculateSpendingAnalysis } from '../../utils/calculations';
import { formatMoney } from '../../utils/csvParser';
import { filterTransactionsByPeriod } from '../../utils/timeFilter';
import type { TimePeriod } from './TimePeriodSelector';

interface SpendingAnalysisProps {
  timePeriod?: TimePeriod;
}

const SpendingAnalysis: React.FC<SpendingAnalysisProps> = ({ timePeriod = 'all' }) => {
  const { state } = useAppContext();

  // Filter transactions by time period
  const filteredTransactions = filterTransactionsByPeriod(state.transactions, timePeriod);

  if (!filteredTransactions.length) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <p className="text-gray-500">No transaction data to analyze for the selected time period</p>
        </div>
      </div>
    );
  }

  const analysis = calculateSpendingAnalysis(filteredTransactions);
  const expenses = filteredTransactions.filter(t => !t.isIncome && t.category !== 'Investment');
  const income = filteredTransactions.filter(t => t.isIncome && t.category !== 'Rent Offset');
  const investments = filteredTransactions.filter(t => !t.isIncome && t.category === 'Investment');
  const rentOffsets = filteredTransactions.filter(t => t.category === 'Rent Offset');

  const baseExpenses = expenses.reduce((sum, t) => sum + Math.abs(t.money), 0);
  const offsetAmount = rentOffsets.reduce((sum, t) => sum + Math.abs(t.money), 0);
  const totalExpenses = baseExpenses - offsetAmount;
  const totalIncome = income.reduce((sum, t) => sum + t.money, 0);
  const totalInvestments = investments.reduce((sum, t) => sum + Math.abs(t.money), 0);
  const netChange = totalIncome - totalExpenses - totalInvestments;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900">{formatMoney(totalExpenses)}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Income</p>
              <p className="text-2xl font-bold text-gray-900">{formatMoney(totalIncome)}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Net Change</p>
              <p className={`text-2xl font-bold ${netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatMoney(netChange)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{state.transactions.length}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Investments</p>
              <p className="text-2xl font-bold text-gray-900">{formatMoney(totalInvestments)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Spending Averages */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending Averages</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Daily Average</p>
            <p className="text-xl font-bold text-gray-900">{formatMoney(analysis.dailyAverage)}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Weekly Average</p>
            <p className="text-xl font-bold text-gray-900">{formatMoney(analysis.weeklyAverage)}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Monthly Average</p>
            <p className="text-xl font-bold text-gray-900">{formatMoney(analysis.monthlyAverage)}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Yearly Average</p>
            <p className="text-xl font-bold text-gray-900">{formatMoney(analysis.yearlyAverage)}</p>
          </div>
        </div>
      </div>

      {/* Spending Statistics */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Spending Variance</p>
            <p className="text-xl font-bold text-gray-900">{formatMoney(analysis.variance)}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Standard Deviation</p>
            <p className="text-xl font-bold text-gray-900">{formatMoney(analysis.standardDeviation)}</p>
          </div>
        </div>
      </div>

      {/* Income vs Expenses */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Income vs Expenses</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-600">Income</p>
            <p className="text-2xl font-bold text-green-600">{formatMoney(totalIncome)}</p>
            <p className="text-xs text-green-600">{income.length} transactions</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-red-600">Expenses</p>
            <p className="text-2xl font-bold text-red-600">{formatMoney(totalExpenses)}</p>
            <p className="text-xs text-red-600">{expenses.length} transactions</p>
          </div>
          <div className="text-center p-4 bg-emerald-50 rounded-lg">
            <p className="text-sm text-emerald-600">Cash Savings</p>
            <p className="text-2xl font-bold text-emerald-600">{formatMoney(totalIncome - totalExpenses - totalInvestments)}</p>
            <p className="text-xs text-emerald-600">
              {totalIncome > 0 ? (((totalIncome - totalExpenses - totalInvestments) / totalIncome) * 100).toFixed(1) : 0}% of income
            </p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-600">Total Savings</p>
            <p className="text-2xl font-bold text-blue-600">{formatMoney(totalIncome - totalExpenses)}</p>
            <p className="text-xs text-blue-600">
              {totalIncome > 0 ? (((totalIncome - totalExpenses) / totalIncome) * 100).toFixed(1) : 0}% of income
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpendingAnalysis; 