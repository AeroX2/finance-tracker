import React from 'react';
import { TrendingUp, DollarSign, Target, PiggyBank } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { 
  calculateIncomeAnalysis, 
  getIncomeTransactions, 
  getExpenseTransactions,
  getInvestmentTransactions,
  calculateIncomeTotal,
  calculateExpenseTotal
} from '../../utils/calculations';
import { formatMoney } from '../../utils/csvParser';

const IncomeAnalysis: React.FC = () => {
  const { state } = useAppContext();

  if (!state.transactions.length) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <p className="text-gray-500">No transaction data to analyze</p>
        </div>
      </div>
    );
  }

  const income = getIncomeTransactions(state.transactions);
  const expenses = getExpenseTransactions(state.transactions);
  const investments = getInvestmentTransactions(state.transactions);
  
  const totalIncome = calculateIncomeTotal(income);
  const totalExpenses = calculateExpenseTotal(expenses);
  const totalInvestments = calculateExpenseTotal(investments);
  const netSavings = totalIncome - totalExpenses - totalInvestments;

  const incomeAnalysis = state.yearlySalary 
    ? calculateIncomeAnalysis(state.transactions, state.yearlySalary)
    : null;

  const getIncomeInsight = () => {
    if (income.length === 0) return 'No income transactions found.';
    if (income.length === 1) return 'You have one income source.';
    return `You have ${income.length} income sources.`;
  };

  const getSavingsInsight = () => {
    if (netSavings > 0) {
      const savingsRate = (netSavings / totalIncome) * 100;
      if (savingsRate > 20) return 'Excellent! You\'re saving a significant portion of your income.';
      if (savingsRate > 10) return 'Good job! You\'re maintaining a healthy savings rate.';
      return 'You\'re saving some money. Consider increasing your savings rate.';
    }
    return 'You\'re spending more than you earn. Consider reviewing your expenses.';
  };

  return (
    <div className="space-y-6">
      {/* Income Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
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
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Income Sources</p>
              <p className="text-2xl font-bold text-gray-900">{income.length}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <PiggyBank className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Net Savings</p>
              <p className={`text-2xl font-bold ${netSavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatMoney(netSavings)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Target className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Savings Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Salary Analysis */}
      {state.yearlySalary && incomeAnalysis && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Salary Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Expected Weekly Income</p>
              <p className="text-xl font-bold text-gray-900">{formatMoney(incomeAnalysis.weeklyIncomeIncrease)}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Expected Monthly Income</p>
              <p className="text-xl font-bold text-gray-900">{formatMoney(incomeAnalysis.monthlyIncomeIncrease)}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Actual Savings Rate</p>
              <p className="text-xl font-bold text-gray-900">{incomeAnalysis.savingsRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Income vs Salary Comparison */}
      {state.yearlySalary && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Income vs Expected Salary</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Your Annual Salary</span>
              <span className="font-semibold">{formatMoney(state.yearlySalary)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Actual Income (from transactions)</span>
              <span className="font-semibold">{formatMoney(totalIncome)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Difference</span>
              <span className={`font-semibold ${totalIncome >= state.yearlySalary ? 'text-green-600' : 'text-red-600'}`}>
                {formatMoney(totalIncome - state.yearlySalary)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Income Trends */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Income Trends</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Average Income per Transaction</span>
            <span className="font-semibold">
              {income.length > 0 ? formatMoney(totalIncome / income.length) : '$0.00'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Largest Income Transaction</span>
            <span className="font-semibold">
              {income.length > 0 ? formatMoney(Math.max(...income.map(t => t.money))) : '$0.00'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Smallest Income Transaction</span>
            <span className="font-semibold">
              {income.length > 0 ? formatMoney(Math.min(...income.map(t => t.money))) : '$0.00'}
            </span>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Income Insights</h3>
        <div className="space-y-3">
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">{getIncomeInsight()}</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-800">{getSavingsInsight()}</p>
          </div>
          {state.yearlySalary && totalIncome < state.yearlySalary && (
            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                Your actual income is lower than your expected salary. This might be due to:
                <br />• Part-time work or reduced hours
                <br />• Missing income transactions in the data
                <br />• Salary changes during the period
              </p>
            </div>
          )}
          {state.yearlySalary && totalIncome > state.yearlySalary && (
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                Your actual income is higher than your expected salary! This could be due to:
                <br />• Bonuses or overtime
                <br />• Additional income sources
                <br />• Salary increases
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IncomeAnalysis; 