import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { useAppContext } from '../../context/AppContext';
import { calculateTrendData, calculateBalanceAwareTrendData, calculateNetWorthTrendData, calculateNetWorthBalanceAwareTrendData } from '../../utils/calculations';
import { formatMoney, formatDate } from '../../utils/csvParser';
import { filterTransactionsByPeriod } from '../../utils/timeFilter';
import type { TimePeriod, CustomDateRange } from '../Analysis/TimePeriodSelector';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface SpendingChartProps {
  type?: 'line' | 'bar';
  showTrendline?: boolean;
  timePeriod?: TimePeriod;
  customDateRange?: CustomDateRange;
}

const SpendingChart: React.FC<SpendingChartProps> = ({ 
  type = 'line', 
  showTrendline = true,
  timePeriod = 'all',
  customDateRange
}) => {
  const { state } = useAppContext();
  const [useBalanceAware, setUseBalanceAware] = useState(true);
  const [useNetWorth, setUseNetWorth] = useState(false);

  // Filter transactions by time period
  const filteredTransactions = filterTransactionsByPeriod(state.transactions, timePeriod, customDateRange);

  if (!filteredTransactions.length) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <p className="text-gray-500">No transaction data for the selected time period</p>
        </div>
      </div>
    );
  }

  // Calculate trend data based on mode (spending vs net worth)
  const trendData = (() => {
    if (useNetWorth) {
      return useBalanceAware && state.currentBalance 
        ? calculateNetWorthBalanceAwareTrendData(filteredTransactions, state.currentBalance)
        : calculateNetWorthTrendData(filteredTransactions);
    } else {
      return useBalanceAware && state.currentBalance 
        ? calculateBalanceAwareTrendData(filteredTransactions, state.currentBalance)
        : calculateTrendData(filteredTransactions);
    }
  })();
  
  // Prepare data for chart
  const labels = trendData.map(point => formatDate(point.date));
  const cumulativeData = trendData.map(point => point.cumulative);
  const transactionData = trendData.map(point => point.value);

  // Calculate trendline with confidence metrics
  const trendlineResult = showTrendline ? calculateTrendline(trendData) : null;

  const chartData = {
    labels,
    datasets: [
      {
        label: useNetWorth 
          ? (useBalanceAware && state.currentBalance ? 'Net Worth' : 'Cumulative Net Worth')
          : (useBalanceAware && state.currentBalance ? 'Account Balance' : 'Cumulative Balance'),
        data: cumulativeData,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.1,
        pointRadius: 0, // Remove points, show just the line
        pointHoverRadius: 4, // Show points only on hover
      },
      ...(trendlineResult ? [{
        label: `Trendline (R² = ${trendlineResult.rSquared.toFixed(3)})`,
        data: trendlineResult.data,
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'transparent',
        borderWidth: 2,
        fill: false,
        tension: 0,
        pointRadius: 0, // No points on trendline
        pointHoverRadius: 0, // No hover points on trendline
      }] : []),
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          padding: 20,
          font: {
            size: 14,
          },
        },
      },
      title: {
        display: true,
        text: 'Spending Over Time',
        font: {
          size: 18,
          weight: 'bold' as const,
        },
        padding: 20,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${formatMoney(value)}`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          font: {
            size: 12,
          },
          maxRotation: 45,
          minRotation: 0,
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      y: {
        beginAtZero: false,
        ticks: {
          font: {
            size: 12,
          },
          callback: function(value: any) {
            return formatMoney(value);
          },
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    elements: {
      point: {
        radius: 4,
        hoverRadius: 6,
      },
      line: {
        tension: 0.1,
      },
    },
  };

  const barData = {
    labels,
    datasets: [
      {
        label: 'Daily Transactions',
        data: transactionData,
        backgroundColor: transactionData.map(value => 
          value >= 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)'
        ),
        borderColor: transactionData.map(value => 
          value >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
        ),
        borderWidth: 3,
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          padding: 20,
          font: {
            size: 14,
          },
        },
      },
      title: {
        display: true,
        text: 'Daily Transactions',
        font: {
          size: 18,
          weight: 'bold' as const,
        },
        padding: 20,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: function(context: any) {
            const value = context.parsed.y;
            return `Amount: ${formatMoney(value)}`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          font: {
            size: 12,
          },
          maxRotation: 45,
          minRotation: 0,
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)',
        },
        categoryPercentage: 0.9,
        barPercentage: 0.95,
      },
      y: {
        beginAtZero: true,
        ticks: {
          font: {
            size: 12,
          },
          callback: function(value: any) {
            return formatMoney(value);
          },
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
    elements: {
      bar: {
        borderWidth: 3,
        borderRadius: 6,
        borderSkipped: false,
      },
    },
  };

  return (
    <div className="card">
      <div className="mb-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900">
            {type === 'line' ? (useNetWorth ? 'Net Worth Timeline' : 'Spending Timeline') : 'Daily Transactions'}
          </h3>
          {type === 'line' && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setUseNetWorth(!useNetWorth)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  useNetWorth
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {useNetWorth ? 'Net Worth' : 'Spending'}
              </button>
              {state.currentBalance && (
                <button
                  onClick={() => setUseBalanceAware(!useBalanceAware)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    useBalanceAware
                      ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  {useBalanceAware ? 'Account Balance' : 'Relative Balance'}
                </button>
              )}
            </div>
          )}
        </div>
        <p className="text-sm text-gray-600">
          {type === 'line' 
            ? useNetWorth
              ? useBalanceAware && state.currentBalance
                ? 'Shows your net worth over time (investments count as positive assets)'
                : 'Shows cumulative net worth changes (investments count as positive assets)'
              : useBalanceAware && state.currentBalance
                ? 'Shows your actual account balance over time based on transaction history'
                : 'Shows cumulative balance changes over time with trend analysis'
            : 'Shows individual transaction amounts by day'
          }
        </p>
      </div>
      
      <div className="h-96">
        {type === 'line' ? (
          <Line data={chartData} options={options} />
        ) : (
          <Bar data={barData} options={barOptions} />
        )}
      </div>
      
      <div className={`mt-4 grid grid-cols-1 ${trendlineResult && showTrendline ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4 text-sm`}>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-gray-600">Total Transactions</p>
          <p className="font-semibold text-gray-900">{filteredTransactions.length}</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-gray-600">Date Range</p>
          <p className="font-semibold text-gray-900">
            {trendData.length > 0 ? `${formatDate(trendData[0]?.date || '')} - ${formatDate(trendData[trendData.length - 1]?.date || '')}` : 'No data'}
          </p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-gray-600">
            {useNetWorth
              ? (useBalanceAware && state.currentBalance ? 'Current Net Worth' : 'Net Worth Change')
              : (useBalanceAware && state.currentBalance ? 'Current Balance' : 'Net Change')
            }
          </p>
          <p className={`font-semibold ${
            useBalanceAware && state.currentBalance 
              ? (state.currentBalance >= 0 ? 'text-green-600' : 'text-red-600')
              : (cumulativeData[cumulativeData.length - 1] >= 0 ? 'text-green-600' : 'text-red-600')
          }`}>
            {useBalanceAware && state.currentBalance 
              ? formatMoney(state.currentBalance)
              : formatMoney(cumulativeData[cumulativeData.length - 1] || 0)
            }
          </p>
        </div>
        {trendlineResult && showTrendline && (
          <div className="p-3 bg-red-50 rounded-lg">
            <p className="text-gray-600">Trend Fit (R²)</p>
            <p className="font-semibold text-red-600">
              {(trendlineResult.rSquared * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {trendlineResult.rSquared > 0.8 ? 'Strong' : 
               trendlineResult.rSquared > 0.5 ? 'Moderate' : 'Weak'} correlation
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced trendline calculation with confidence metrics
const calculateTrendline = (trendData: any[]) => {
  if (trendData.length < 2) return null;

  const n = trendData.length;
  const xValues = trendData.map((_, index) => index);
  const yValues = trendData.map(point => point.cumulative);

  const sumX = xValues.reduce((sum, x) => sum + x, 0);
  const sumY = yValues.reduce((sum, y) => sum + y, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
  const sumYY = yValues.reduce((sum, y) => sum + y * y, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R-squared (coefficient of determination)
  const meanY = sumY / n;
  const trendlineValues = xValues.map(x => slope * x + intercept);
  
  const totalSumSquares = yValues.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
  const residualSumSquares = yValues.reduce((sum, y, i) => sum + Math.pow(y - trendlineValues[i], 2), 0);
  
  const rSquared = Math.max(0, 1 - (residualSumSquares / totalSumSquares));
  
  // Calculate correlation coefficient
  const correlation = Math.sqrt(rSquared) * (slope >= 0 ? 1 : -1);

  return {
    data: trendlineValues,
    rSquared,
    correlation,
    slope,
    intercept
  };
};

export default SpendingChart; 