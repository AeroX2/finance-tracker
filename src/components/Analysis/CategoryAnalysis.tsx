import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { useAppContext } from '../../context/AppContext';
import { getCategoryColor } from '../../utils/calculations';
import { formatMoney } from '../../utils/csvParser';
import { filterTransactionsByPeriod } from '../../utils/timeFilter';
import type { TimePeriod, CustomDateRange } from './TimePeriodSelector';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface CategoryAnalysisProps {
  timePeriod?: TimePeriod;
  customDateRange?: CustomDateRange;
}

const CategoryAnalysis: React.FC<CategoryAnalysisProps> = ({ timePeriod = 'all', customDateRange }) => {
  const { state } = useAppContext();
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');

  // Filter transactions by time period
  const filteredTransactions = filterTransactionsByPeriod(state.transactions, timePeriod, customDateRange);

  if (!filteredTransactions.length) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <p className="text-gray-500">No transaction data to analyze for the selected time period</p>
        </div>
      </div>
    );
  }

  const expenses = filteredTransactions.filter(t => !t.isIncome);
  
  // Group expenses by category
  const spendingByCategory: Record<string, number> = {};
  expenses.forEach(transaction => {
    const category = transaction.category || 'Uncategorized';
    spendingByCategory[category] = (spendingByCategory[category] || 0) + Math.abs(transaction.money);
  });

  // Sort categories by spending amount
  const sortedCategories = Object.entries(spendingByCategory)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10); // Show top 10 categories

  const chartData = {
    labels: sortedCategories.map(([category]) => category),
    datasets: [
      {
        data: sortedCategories.map(([, amount]) => amount),
        backgroundColor: sortedCategories.map(([category]) => getCategoryColor(category)),
        borderColor: sortedCategories.map(([category]) => getCategoryColor(category)),
        borderWidth: 2,
      },
    ],
  };

  const barData = {
    labels: sortedCategories.map(([category]) => category),
    datasets: [
      {
        label: 'Spending by Category',
        data: sortedCategories.map(([, amount]) => amount),
        backgroundColor: sortedCategories.map(([category]) => getCategoryColor(category)),
        borderColor: sortedCategories.map(([category]) => getCategoryColor(category)),
        borderWidth: 1,
      },
    ],
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: true,
        text: 'Spending by Category',
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${formatMoney(value)} (${percentage}%)`;
          },
        },
      },
    },
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Spending by Category',
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const value = context.parsed.y;
            return `Amount: ${formatMoney(value)}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return formatMoney(value);
          },
        },
      },
    },
  };

  const totalSpending = expenses.reduce((sum, t) => sum + Math.abs(t.money), 0);

  return (
    <div className="space-y-6">
      {/* Chart Type Selector */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Category Analysis</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setChartType('pie')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                chartType === 'pie'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Pie Chart
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                chartType === 'bar'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Bar Chart
            </button>
          </div>
        </div>

        <div className="h-96 flex items-center justify-center">
          {chartType === 'pie' ? (
            <div className="w-full">
              <Pie data={chartData} options={pieOptions} />
            </div>
          ) : (
            <div className="w-full">
              <Bar data={barData} options={barOptions} />
            </div>
          )}
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Breakdown</h3>
        <div className="space-y-3">
          {sortedCategories.map(([category, amount]) => {
            const percentage = ((amount / totalSpending) * 100).toFixed(1);
            return (
              <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: getCategoryColor(category) }}
                  ></div>
                  <span className="font-medium text-gray-900">{category}</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatMoney(amount)}</p>
                  <p className="text-sm text-gray-600">{percentage}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <h4 className="text-sm font-medium text-gray-600 mb-2">Total Categories</h4>
          <p className="text-2xl font-bold text-gray-900">{Object.keys(spendingByCategory).length}</p>
        </div>
        <div className="card">
          <h4 className="text-sm font-medium text-gray-600 mb-2">Top Category</h4>
          <p className="text-lg font-semibold text-gray-900">
            {sortedCategories[0]?.[0] || 'N/A'}
          </p>
          <p className="text-sm text-gray-600">
            {sortedCategories[0] ? formatMoney(sortedCategories[0][1]) : ''}
          </p>
        </div>
        <div className="card">
          <h4 className="text-sm font-medium text-gray-600 mb-2">Average per Category</h4>
          <p className="text-2xl font-bold text-gray-900">
            {formatMoney(totalSpending / Object.keys(spendingByCategory).length)}
          </p>
        </div>
      </div>


    </div>
  );
};

export default CategoryAnalysis; 