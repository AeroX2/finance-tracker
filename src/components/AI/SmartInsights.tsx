import React, { useState, useEffect } from 'react';
import { Lightbulb, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, DollarSign } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { 
  calculateSpendingAnalysis, 
  getIncomeTransactions, 
  getExpenseTransactions,
  getInvestmentTransactions,
  calculateIncomeTotal,
  calculateExpenseTotal
} from '../../utils/calculations';
import { formatMoney } from '../../utils/csvParser';

interface Insight {
  id: string;
  type: 'positive' | 'warning' | 'info' | 'suggestion';
  title: string;
  description: string;
  icon: React.ReactNode;
  priority: number;
}

const SmartInsights: React.FC = () => {
  const { state } = useAppContext();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (state.transactions.length > 0) {
      generateInsights();
    }
  }, [state.transactions, state.yearlySalary]);

  const generateInsights = () => {
    setIsAnalyzing(true);
    
    // Simulate analysis delay
    setTimeout(() => {
      const newInsights: Insight[] = [];
      
      if (state.transactions.length === 0) {
        setIsAnalyzing(false);
        return;
      }

      const analysis = calculateSpendingAnalysis(state.transactions);
      const expenses = getExpenseTransactions(state.transactions);
      const income = getIncomeTransactions(state.transactions);
      const investments = getInvestmentTransactions(state.transactions);
      
      const totalExpenses = calculateExpenseTotal(expenses);
      const totalIncome = calculateIncomeTotal(income);
      const totalInvestments = calculateExpenseTotal(investments);
      const netChange = totalIncome - totalExpenses - totalInvestments;
      const savingsRate = totalIncome > 0 ? (netChange / totalIncome) * 100 : 0;

      // Spending Pattern Insights
      if (analysis.dailyAverage > 200) {
        newInsights.push({
          id: 'high-spending',
          type: 'warning',
          title: 'High Daily Spending',
          description: `Your average daily spending is ${formatMoney(analysis.dailyAverage)}, which is above typical levels. Consider reviewing your expenses to identify areas for reduction.`,
          icon: <TrendingDown className="h-5 w-5 text-red-600" />,
          priority: 3
        });
      }

      if (analysis.dailyAverage < 50) {
        newInsights.push({
          id: 'low-spending',
          type: 'positive',
          title: 'Excellent Spending Control',
          description: `Your average daily spending of ${formatMoney(analysis.dailyAverage)} shows excellent financial discipline. Keep up the great work!`,
          icon: <CheckCircle className="h-5 w-5 text-green-600" />,
          priority: 1
        });
      }

      // Savings Rate Insights
      if (savingsRate < 0) {
        newInsights.push({
          id: 'negative-savings',
          type: 'warning',
          title: 'Spending More Than Earning',
          description: 'You\'re currently spending more than you\'re earning. This is unsustainable long-term. Consider creating a budget or finding ways to increase income.',
          icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
          priority: 4
        });
      } else if (savingsRate > 20) {
        newInsights.push({
          id: 'excellent-savings',
          type: 'positive',
          title: 'Excellent Savings Rate',
          description: `You're saving ${savingsRate.toFixed(1)}% of your income, which is excellent! This puts you on track for financial security.`,
          icon: <TrendingUp className="h-5 w-5 text-green-600" />,
          priority: 1
        });
      } else if (savingsRate > 10) {
        newInsights.push({
          id: 'good-savings',
          type: 'positive',
          title: 'Good Savings Rate',
          description: `You're saving ${savingsRate.toFixed(1)}% of your income, which is a healthy rate. Consider increasing to 20% for better financial security.`,
          icon: <CheckCircle className="h-5 w-5 text-green-600" />,
          priority: 2
        });
      }

      // Category Analysis
      const spendingByCategory: Record<string, number> = {};
      expenses.forEach(transaction => {
        const category = transaction.category || 'Uncategorized';
        spendingByCategory[category] = (spendingByCategory[category] || 0) + Math.abs(transaction.money);
      });

      const topCategory = Object.entries(spendingByCategory)
        .sort(([,a], [,b]) => b - a)[0];

      if (topCategory && topCategory[1] > totalExpenses * 0.4) {
        newInsights.push({
          id: 'category-concentration',
          type: 'warning',
          title: 'High Category Concentration',
          description: `${topCategory[0]} represents ${((topCategory[1] / totalExpenses) * 100).toFixed(1)}% of your spending. Consider diversifying your expenses.`,
          icon: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
          priority: 3
        });
      }

      // Income Analysis
      if (state.yearlySalary) {
        const actualIncome = totalIncome;
        const expectedIncome = state.yearlySalary;
        const incomeRatio = actualIncome / expectedIncome;

        if (incomeRatio < 0.8) {
          newInsights.push({
            id: 'low-income',
            type: 'warning',
            title: 'Income Below Expected',
            description: `Your actual income is ${(incomeRatio * 100).toFixed(1)}% of your expected salary. This might indicate part-time work or missing transactions.`,
            icon: <TrendingDown className="h-5 w-5 text-red-600" />,
            priority: 3
          });
        } else if (incomeRatio > 1.2) {
          newInsights.push({
            id: 'high-income',
            type: 'positive',
            title: 'Income Above Expected',
            description: `Your actual income is ${(incomeRatio * 100).toFixed(1)}% of your expected salary. Great job with bonuses or additional income sources!`,
            icon: <TrendingUp className="h-5 w-5 text-green-600" />,
            priority: 1
          });
        }
      }

      // Spending Variance Insights
      if (analysis.standardDeviation > analysis.dailyAverage * 0.8) {
        newInsights.push({
          id: 'volatile-spending',
          type: 'warning',
          title: 'Volatile Spending Pattern',
          description: 'Your spending is quite volatile. Consider creating a budget to smooth out your expenses and avoid financial stress.',
          icon: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
          priority: 2
        });
      }

      // Transaction Frequency
      const avgTransactionsPerDay = state.transactions.length / Math.max(1, (new Date().getTime() - new Date(state.transactions[0]?.date || Date.now()).getTime()) / (1000 * 60 * 60 * 24));
      
      if (avgTransactionsPerDay > 3) {
        newInsights.push({
          id: 'high-frequency',
          type: 'info',
          title: 'High Transaction Frequency',
          description: `You're making an average of ${avgTransactionsPerDay.toFixed(1)} transactions per day. Consider consolidating small purchases to reduce fees and track spending more easily.`,
          icon: <DollarSign className="h-5 w-5 text-blue-600" />,
          priority: 2
        });
      }

      // Categorization Insights
      const uncategorizedCount = state.transactions.filter(t => !t.category).length;
      const categorizationRate = ((state.transactions.length - uncategorizedCount) / state.transactions.length) * 100;

      if (categorizationRate < 50) {
        newInsights.push({
          id: 'low-categorization',
          type: 'suggestion',
          title: 'Improve Categorization',
          description: `Only ${categorizationRate.toFixed(1)}% of your transactions are categorized. Use the AI categorization tool to get better insights into your spending patterns.`,
          icon: <Lightbulb className="h-5 w-5 text-blue-600" />,
          priority: 2
        });
      }

      // Sort insights by priority (higher priority first)
      newInsights.sort((a, b) => b.priority - a.priority);
      
      setInsights(newInsights);
      setIsAnalyzing(false);
    }, 1000);
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'positive': return 'border-green-200 bg-green-50';
      case 'warning': return 'border-red-200 bg-red-50';
      case 'info': return 'border-blue-200 bg-blue-50';
      case 'suggestion': return 'border-yellow-200 bg-yellow-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getInsightTextColor = (type: string) => {
    switch (type) {
      case 'positive': return 'text-green-800';
      case 'warning': return 'text-red-800';
      case 'info': return 'text-blue-800';
      case 'suggestion': return 'text-yellow-800';
      default: return 'text-gray-800';
    }
  };

  if (!state.transactions.length) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <p className="text-gray-500">No transaction data to analyze</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Lightbulb className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Smart Insights</h3>
            <p className="text-sm text-gray-600">
              AI-powered analysis of your financial patterns and recommendations
            </p>
          </div>
        </div>

        {isAnalyzing && (
          <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-blue-800">Analyzing your financial patterns...</span>
          </div>
        )}
      </div>

      {/* Insights List */}
      {insights.length > 0 && (
        <div className="space-y-4">
          {insights.map((insight) => (
            <div key={insight.id} className={`card border-l-4 ${getInsightColor(insight.type)}`}>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  {insight.icon}
                </div>
                <div className="flex-1">
                  <h4 className={`font-semibold ${getInsightTextColor(insight.type)}`}>
                    {insight.title}
                  </h4>
                  <p className={`text-sm mt-1 ${getInsightTextColor(insight.type)}`}>
                    {insight.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isAnalyzing && insights.length === 0 && (
        <div className="card">
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Great Financial Health!</h4>
            <p className="text-gray-600">
              No concerning patterns detected. Your financial habits look good!
            </p>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <h4 className="text-sm font-medium text-gray-600 mb-2">Insights Generated</h4>
          <p className="text-2xl font-bold text-gray-900">{insights.length}</p>
        </div>
        <div className="card">
          <h4 className="text-sm font-medium text-gray-600 mb-2">Priority Alerts</h4>
          <p className="text-2xl font-bold text-red-600">
            {insights.filter(i => i.priority >= 3).length}
          </p>
        </div>
        <div className="card">
          <h4 className="text-sm font-medium text-gray-600 mb-2">Positive Insights</h4>
          <p className="text-2xl font-bold text-green-600">
            {insights.filter(i => i.type === 'positive').length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SmartInsights; 