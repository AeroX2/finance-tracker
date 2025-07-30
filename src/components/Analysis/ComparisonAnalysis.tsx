import React, { useState } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Calendar, ArrowRight } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { calculateSpendingAnalysis, calculateAnalysisResult } from '../../utils/calculations';
import { formatMoney } from '../../utils/csvParser';
import { filterTransactionsByPeriod } from '../../utils/timeFilter';
import type { TimePeriod } from './TimePeriodSelector';

const timePeriodsOptions: { value: TimePeriod; label: string }[] = [
  { value: 'day', label: 'Last 24 Hours' },
  { value: 'week', label: 'Last 7 Days' },
  { value: 'month', label: 'Last 30 Days' },
  { value: '3months', label: 'Last 3 Months' },
  { value: '6months', label: 'Last 6 Months' },
  { value: 'year', label: 'Last Year' },
  { value: 'all', label: 'All Time' },
];

const ComparisonAnalysis: React.FC = () => {
  const { state } = useAppContext();
  const [period1, setPeriod1] = useState<TimePeriod>('month');
  const [period2, setPeriod2] = useState<TimePeriod>('3months');

  // Filter transactions for both periods
  const transactions1 = filterTransactionsByPeriod(state.transactions, period1);
  const transactions2 = filterTransactionsByPeriod(state.transactions, period2);

  // Calculate analysis for both periods
  const analysis1 = calculateAnalysisResult(transactions1);
  const analysis2 = calculateAnalysisResult(transactions2);
  const spendingAnalysis1 = calculateSpendingAnalysis(transactions1);
  const spendingAnalysis2 = calculateSpendingAnalysis(transactions2);

  const getLabel = (period: TimePeriod) => {
    return timePeriodsOptions.find(p => p.value === period)?.label || period;
  };

  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-red-600" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-green-600" />;
    return <ArrowRight className="h-4 w-4 text-gray-600" />;
  };

  const getChangeColor = (change: number, isExpense: boolean = true) => {
    if (change > 0) return isExpense ? 'text-red-600' : 'text-green-600';
    if (change < 0) return isExpense ? 'text-green-600' : 'text-red-600';
    return 'text-gray-600';
  };

  const MetricCard = ({ 
    title, 
    value1, 
    value2, 
    isExpense = true, 
    showPercentage = true 
  }: { 
    title: string; 
    value1: number; 
    value2: number; 
    isExpense?: boolean;
    showPercentage?: boolean;
  }) => {
    const change = getPercentageChange(value1, value2);
    
    return (
      <div className="card">
        <h4 className="text-sm font-medium text-gray-600 mb-3">{title}</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">{getLabel(period1)}</p>
            <p className="text-lg font-bold text-gray-900">{formatMoney(value1)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">{getLabel(period2)}</p>
            <p className="text-lg font-bold text-gray-900">{formatMoney(value2)}</p>
          </div>
        </div>
        {showPercentage && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              {getChangeIcon(change)}
              <span className={`text-sm font-medium ${getChangeColor(change, isExpense)}`}>
                {Math.abs(change).toFixed(1)}% {change > 0 ? 'higher' : change < 0 ? 'lower' : 'same'} than {getLabel(period2)}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const CategoryComparison = () => {
    // Get top 5 categories from both periods combined
    const allCategories = new Set([
      ...Object.keys(analysis1.spendingByCategory),
      ...Object.keys(analysis2.spendingByCategory)
    ]);
    
    const categoryComparisons = Array.from(allCategories)
      .map(category => ({
        category,
        value1: analysis1.spendingByCategory[category] || 0,
        value2: analysis2.spendingByCategory[category] || 0,
      }))
      .sort((a, b) => Math.max(a.value1, a.value2) - Math.max(b.value1, b.value2))
      .slice(-8)
      .reverse();

    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Comparison</h3>
        <div className="space-y-4">
          {categoryComparisons.map(({ category, value1, value2 }) => {
            const change = getPercentageChange(value1, value2);
            
            return (
              <div key={category} className="border-b border-gray-100 pb-3 last:border-b-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{category}</span>
                  <div className="flex items-center space-x-2">
                    {getChangeIcon(change)}
                    <span className={`text-sm ${getChangeColor(change)}`}>
                      {Math.abs(change).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">{getLabel(period1)}: </span>
                    <span className="font-semibold">{formatMoney(value1)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">{getLabel(period2)}: </span>
                    <span className="font-semibold">{formatMoney(value2)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (!state.transactions.length) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <p className="text-gray-500">No transaction data to compare</p>
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
            <BarChart3 className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Comparison Analysis</h3>
            <p className="text-sm text-gray-600">
              Compare financial metrics across different time periods
            </p>
          </div>
        </div>

        {/* Period Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary Period
            </label>
            <select
              value={period1}
              onChange={(e) => setPeriod1(e.target.value as TimePeriod)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {timePeriodsOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comparison Period
            </label>
            <select
              value={period2}
              onChange={(e) => setPeriod2(e.target.value as TimePeriod)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {timePeriodsOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Metrics Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          title="Total Spending"
          value1={analysis1.totalSpending}
          value2={analysis2.totalSpending}
          isExpense={true}
        />
        <MetricCard
          title="Total Income"
          value1={analysis1.totalIncome}
          value2={analysis2.totalIncome}
          isExpense={false}
        />
        <MetricCard
          title="Net Change"
          value1={analysis1.netChange}
          value2={analysis2.netChange}
          isExpense={false}
        />
        <MetricCard
          title="Daily Average"
          value1={spendingAnalysis1.dailyAverage}
          value2={spendingAnalysis2.dailyAverage}
          isExpense={true}
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Weekly Average"
          value1={spendingAnalysis1.weeklyAverage}
          value2={spendingAnalysis2.weeklyAverage}
          isExpense={true}
        />
        <MetricCard
          title="Monthly Average"
          value1={spendingAnalysis1.monthlyAverage}
          value2={spendingAnalysis2.monthlyAverage}
          isExpense={true}
        />
        <MetricCard
          title="Transaction Count"
          value1={transactions1.length}
          value2={transactions2.length}
          isExpense={false}
          showPercentage={true}
        />
      </div>

      {/* Category Comparison */}
      <CategoryComparison />

      {/* Summary Insights */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h3>
        <div className="space-y-3">
          {(() => {
            const insights = [];
            const spendingChange = getPercentageChange(analysis1.totalSpending, analysis2.totalSpending);
            const incomeChange = getPercentageChange(analysis1.totalIncome, analysis2.totalIncome);
            const netChange = getPercentageChange(analysis1.netChange, analysis2.netChange);

            if (Math.abs(spendingChange) > 10) {
              insights.push(
                <div key="spending" className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  {getChangeIcon(spendingChange)}
                  <p className="text-sm text-gray-700">
                    Your spending is <strong>{Math.abs(spendingChange).toFixed(1)}% {spendingChange > 0 ? 'higher' : 'lower'}</strong> in {getLabel(period1)} compared to {getLabel(period2)}.
                  </p>
                </div>
              );
            }

            if (Math.abs(incomeChange) > 10) {
              insights.push(
                <div key="income" className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  {getChangeIcon(incomeChange)}
                  <p className="text-sm text-gray-700">
                    Your income is <strong>{Math.abs(incomeChange).toFixed(1)}% {incomeChange > 0 ? 'higher' : 'lower'}</strong> in {getLabel(period1)} compared to {getLabel(period2)}.
                  </p>
                </div>
              );
            }

            if (Math.abs(netChange) > 20) {
              insights.push(
                <div key="net" className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  {getChangeIcon(netChange)}
                  <p className="text-sm text-gray-700">
                    Your net financial position is <strong>{Math.abs(netChange).toFixed(1)}% {netChange > 0 ? 'better' : 'worse'}</strong> in {getLabel(period1)} compared to {getLabel(period2)}.
                  </p>
                </div>
              );
            }

            if (insights.length === 0) {
              insights.push(
                <div key="stable" className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                  <Calendar className="h-4 w-4 text-green-600 mt-0.5" />
                  <p className="text-sm text-gray-700">
                    Your financial patterns are relatively <strong>stable</strong> between these two periods.
                  </p>
                </div>
              );
            }

            return insights;
          })()}
        </div>
      </div>
    </div>
  );
};

export default ComparisonAnalysis;