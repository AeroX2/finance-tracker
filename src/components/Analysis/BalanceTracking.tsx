import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { formatMoney, formatDate } from '../../utils/csvParser';
import { filterTransactionsByPeriod } from '../../utils/timeFilter';
import type { TimePeriod } from './TimePeriodSelector';

interface BalancePoint {
  date: string;
  balance: number;
  change: number;
  cumulativeChange: number;
}

interface BalanceTrackingProps {
  timePeriod?: TimePeriod;
}

const BalanceTracking: React.FC<BalanceTrackingProps> = ({ timePeriod = 'all' }) => {
  const { state } = useAppContext();

  const balanceHistory = useMemo(() => {
    if (!state.currentBalance || !state.transactions.length) {
      return [];
    }

    // Filter transactions by time period
    const filteredTransactions = filterTransactionsByPeriod(state.transactions, timePeriod);
    
    // Sort transactions by date
    const sortedTransactions = [...filteredTransactions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate balance history
    const balancePoints: BalancePoint[] = [];
    let runningBalance = state.currentBalance;
    let cumulativeChange = 0;

    // Start with current balance
    balancePoints.push({
      date: new Date().toISOString().split('T')[0],
      balance: runningBalance,
      change: 0,
      cumulativeChange: 0
    });

    // Work backwards through transactions to calculate historical balances
    for (let i = sortedTransactions.length - 1; i >= 0; i--) {
      const transaction = sortedTransactions[i];
      const change = -transaction.money; // Reverse the transaction to go backwards
      runningBalance -= change;
      cumulativeChange += transaction.money;

      balancePoints.unshift({
        date: transaction.date,
        balance: runningBalance,
        change: transaction.money,
        cumulativeChange
      });
    }

    return balancePoints;
  }, [state.currentBalance, state.transactions, timePeriod]);

  const currentBalance = state.currentBalance || 0;
  const totalChange = balanceHistory.length > 0 ? balanceHistory[balanceHistory.length - 1].cumulativeChange : 0;
  const startingBalance = balanceHistory.length > 0 ? balanceHistory[0].balance : currentBalance;
  const balanceChange = currentBalance - startingBalance;
  const percentageChange = startingBalance > 0 ? (balanceChange / startingBalance) * 100 : 0;

  const getBalanceInsight = () => {
    if (balanceChange > 0) {
      if (percentageChange > 10) return 'Excellent! Your balance has grown significantly.';
      if (percentageChange > 5) return 'Good progress! Your balance is growing steadily.';
      return 'Your balance is increasing. Keep up the good work!';
    } else if (balanceChange < 0) {
      if (percentageChange < -10) return 'Warning: Your balance has decreased significantly.';
      if (percentageChange < -5) return 'Your balance has decreased. Consider reviewing expenses.';
      return 'Your balance has decreased slightly. Monitor your spending.';
    }
    return 'Your balance has remained stable.';
  };

  const getTrendIcon = () => {
    if (balanceChange > 0) return <TrendingUp className="h-5 w-5 text-green-600" />;
    if (balanceChange < 0) return <TrendingDown className="h-5 w-5 text-red-600" />;
    return <DollarSign className="h-5 w-5 text-gray-600" />;
  };

  const getTrendColor = () => {
    if (balanceChange > 0) return 'text-green-600';
    if (balanceChange < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (!state.currentBalance) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Set your current balance to track account changes over time</p>
        </div>
      </div>
    );
  }

  if (!state.transactions.length) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No transaction data to analyze for balance tracking</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Current Balance</p>
              <p className="text-2xl font-bold text-gray-900">{formatMoney(currentBalance)}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Starting Balance</p>
              <p className="text-2xl font-bold text-gray-900">{formatMoney(startingBalance)}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              {getTrendIcon()}
            </div>
            <div>
              <p className="text-sm text-gray-600">Balance Change</p>
              <p className={`text-2xl font-bold ${getTrendColor()}`}>
                {formatMoney(balanceChange)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Calendar className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">% Change</p>
              <p className={`text-2xl font-bold ${getTrendColor()}`}>
                {percentageChange.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Balance Timeline */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Balance Timeline</h3>
        
        {balanceHistory.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {balanceHistory.map((point, index) => (
              <div key={point.date} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-600">{formatDate(point.date)}</div>
                  <div className="flex items-center space-x-2">
                    {point.change > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : point.change < 0 ? (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    ) : (
                      <DollarSign className="h-4 w-4 text-gray-600" />
                    )}
                    <span className={`text-sm font-medium ${
                      point.change > 0 ? 'text-green-600' : 
                      point.change < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {formatMoney(point.change)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">{formatMoney(point.balance)}</div>
                  <div className="text-xs text-gray-500">
                    {point.cumulativeChange > 0 ? '+' : ''}{formatMoney(point.cumulativeChange)} total
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No balance history available for the selected time period</p>
          </div>
        )}
      </div>

      {/* Balance Insights */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Balance Insights</h3>
        
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">{getBalanceInsight()}</p>
          </div>

          {balanceHistory.length > 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Highest Balance</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatMoney(Math.max(...balanceHistory.map(p => p.balance)))}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Lowest Balance</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatMoney(Math.min(...balanceHistory.map(p => p.balance)))}
                </p>
              </div>
            </div>
          )}

          {balanceHistory.length > 7 && (
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <span className="font-medium">Trend:</span> Your balance has changed by{' '}
                <span className="font-semibold">{formatMoney(balanceChange)}</span> over{' '}
                <span className="font-semibold">{balanceHistory.length}</span> data points.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Balance Statistics */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Balance Statistics</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Average Balance</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatMoney(balanceHistory.reduce((sum, p) => sum + p.balance, 0) / balanceHistory.length)}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Balance Volatility</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatMoney(Math.max(...balanceHistory.map(p => p.balance)) - Math.min(...balanceHistory.map(p => p.balance)))}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Data Points</p>
            <p className="text-lg font-semibold text-gray-900">{balanceHistory.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BalanceTracking; 