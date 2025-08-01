import React, { useState, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { formatMoney, formatDate } from '../../utils/csvParser';

type ViewMode = 'day' | 'month' | 'year';
type DataMode = 'spending' | 'income' | 'net';

interface DayData {
  date: string;
  spending: number;
  income: number;
  net: number;
  transactions: any[];
  isEmpty: boolean;
}

interface MonthData {
  month: string;
  year: number;
  spending: number;
  income: number;
  net: number;
  transactions: any[];
  daysWithTransactions: number;
}

interface YearData {
  year: number;
  spending: number;
  income: number;
  net: number;
  transactions: any[];
  monthsWithTransactions: number;
}

interface SpendingHeatmapProps {
  className?: string;
}

const SpendingHeatmap: React.FC<SpendingHeatmapProps> = ({ className = '' }) => {
  const { state } = useAppContext();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [dataMode, setDataMode] = useState<DataMode>('spending');
  const [excludeRent, setExcludeRent] = useState(false);

  // Helper function to identify rent-related expense transactions
  const isRentTransaction = (transaction: any) => {
    if (!transaction.category && !transaction.description) return false;
    
    const category = (transaction.category || '').toLowerCase();
    const description = (transaction.description || '').toLowerCase();
    
    // Check category matches (only for expense categories)
    const rentCategories = ['home', 'rent', 'housing'];
    if (rentCategories.some(cat => category.includes(cat))) {
      return true;
    }
    
    // Check description for rent-related keywords
    const rentKeywords = ['rent', 'housing', 'lease', 'mortgage', 'property', 'apartment', 'flat'];
    return rentKeywords.some(keyword => description.includes(keyword));
  };

  // Get calendar data for current period
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    if (viewMode === 'day') {
      // Day view - show calendar month
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const firstDayWeekday = firstDay.getDay(); // 0 = Sunday
      
      const days: DayData[] = [];
      
      // Add padding days from previous month
      const prevMonth = new Date(year, month - 1, 0);
      for (let i = firstDayWeekday - 1; i >= 0; i--) {
        const date = new Date(year, month - 1, prevMonth.getDate() - i);
        days.push({
          date: date.toISOString().split('T')[0],
          spending: 0,
          income: 0,
          net: 0,
          transactions: [],
          isEmpty: true
        });
      }
      
      // Add days from current month
      for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(year, month, day);
        const dateStr = date.toISOString().split('T')[0];
        
        // Find transactions for this day
        const dayTransactions = state.transactions.filter(t => {
          const tDate = new Date(t.date.split('/').reverse().join('-'));
          return tDate.toISOString().split('T')[0] === dateStr;
        });
        
        // Filter out rent transactions if toggle is enabled
        const filteredTransactions = excludeRent 
          ? dayTransactions.filter(t => !isRentTransaction(t))
          : dayTransactions;
        
        const spending = filteredTransactions
          .filter(t => !t.isIncome)
          .reduce((sum, t) => sum + Math.abs(t.money), 0);
        
        const income = filteredTransactions
          .filter(t => t.isIncome)
          .reduce((sum, t) => sum + t.money, 0);
        
        days.push({
          date: dateStr,
          spending,
          income,
          net: income - spending,
          transactions: filteredTransactions,
          isEmpty: false
        });
      }
      
      // Add padding days from next month
      const remainingCells = 42 - days.length;
      for (let day = 1; day <= remainingCells; day++) {
        const date = new Date(year, month + 1, day);
        days.push({
          date: date.toISOString().split('T')[0],
          spending: 0,
          income: 0,
          net: 0,
          transactions: [],
          isEmpty: true
        });
      }
      
      return days;
    } else if (viewMode === 'month') {
      // Month view - show 12 months of the year
      const months: MonthData[] = [];
      
      for (let m = 0; m < 12; m++) {
        const monthTransactions = state.transactions.filter(t => {
          const tDate = new Date(t.date.split('/').reverse().join('-'));
          return tDate.getFullYear() === year && tDate.getMonth() === m;
        });
        
        // Filter out rent transactions if toggle is enabled
        const filteredTransactions = excludeRent 
          ? monthTransactions.filter(t => !isRentTransaction(t))
          : monthTransactions;
        
        const spending = filteredTransactions
          .filter(t => !t.isIncome)
          .reduce((sum, t) => sum + Math.abs(t.money), 0);
        
        const income = filteredTransactions
          .filter(t => t.isIncome)
          .reduce((sum, t) => sum + t.money, 0);
        
        const daysWithTransactions = new Set(
          filteredTransactions.map(t => t.date.split('/').reverse().join('-').split('T')[0])
        ).size;
        
        months.push({
          month: new Date(year, m).toLocaleDateString('en-US', { month: 'long' }),
          year,
          spending,
          income,
          net: income - spending,
          transactions: filteredTransactions,
          daysWithTransactions
        });
      }
      
      return months;
    } else {
      // Year view - show multiple years
      const years: YearData[] = [];
      const currentYear = new Date().getFullYear();
      const startYear = Math.min(currentYear - 5, year - 2);
      const endYear = Math.max(currentYear, year + 2);
      
      for (let y = startYear; y <= endYear; y++) {
        const yearTransactions = state.transactions.filter(t => {
          const tDate = new Date(t.date.split('/').reverse().join('-'));
          return tDate.getFullYear() === y;
        });
        
        // Filter out rent transactions if toggle is enabled
        const filteredTransactions = excludeRent 
          ? yearTransactions.filter(t => !isRentTransaction(t))
          : yearTransactions;
        
        const spending = filteredTransactions
          .filter(t => !t.isIncome)
          .reduce((sum, t) => sum + Math.abs(t.money), 0);
        
        const income = filteredTransactions
          .filter(t => t.isIncome)
          .reduce((sum, t) => sum + t.money, 0);
        
        const monthsWithTransactions = new Set(
          filteredTransactions.map(t => {
            const tDate = new Date(t.date.split('/').reverse().join('-'));
            return tDate.getMonth();
          })
        ).size;
        
        years.push({
          year: y,
          spending,
          income,
          net: income - spending,
          transactions: filteredTransactions,
          monthsWithTransactions
        });
      }
      
      return years;
    }
  }, [currentDate, state.transactions, viewMode, excludeRent]);

  // Calculate color intensity
  const getColorIntensity = (item: any) => {
    if (viewMode === 'day' && (item.isEmpty || item.transactions.length === 0)) return 0;
    if (viewMode !== 'day' && item.transactions.length === 0) return 0;
    
    const value = dataMode === 'spending' ? item.spending : 
                  dataMode === 'income' ? item.income : 
                  Math.abs(item.net);
    
    const maxValue = Math.max(...(calendarData as any[])
      .filter(d => viewMode === 'day' ? !d.isEmpty : true)
      .map(d => dataMode === 'spending' ? d.spending : 
                dataMode === 'income' ? d.income : 
                Math.abs(d.net)));
    
    if (maxValue === 0) return 0;
    return Math.min(value / maxValue, 1);
  };

  const getCellBackground = (item: any) => {
    if (viewMode === 'day' && (item.isEmpty || item.transactions.length === 0)) return {};
    if (viewMode !== 'day' && item.transactions.length === 0) return {};
    
    const intensity = getColorIntensity(item);
    
    if (dataMode === 'spending') {
      const alpha = 0.1 + (intensity * 0.7);
      return { backgroundColor: `rgba(239, 68, 68, ${alpha})` }; // red
    } else if (dataMode === 'income') {
      const alpha = 0.1 + (intensity * 0.7);
      return { backgroundColor: `rgba(34, 197, 94, ${alpha})` }; // green
    } else {
      const alpha = 0.1 + (intensity * 0.7);
      const color = item.net >= 0 ? '34, 197, 94' : '239, 68, 68'; // green or red
      return { backgroundColor: `rgba(${color}, ${alpha})` };
    }
  };

  const navigate = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (viewMode === 'day') {
        if (direction === 'prev') {
          newDate.setMonth(prev.getMonth() - 1);
        } else {
          newDate.setMonth(prev.getMonth() + 1);
        }
      } else if (viewMode === 'month') {
        if (direction === 'prev') {
          newDate.setFullYear(prev.getFullYear() - 1);
        } else {
          newDate.setFullYear(prev.getFullYear() + 1);
        }
      } else {
        if (direction === 'prev') {
          newDate.setFullYear(prev.getFullYear() - 5);
        } else {
          newDate.setFullYear(prev.getFullYear() + 5);
        }
      }
      return newDate;
    });
    setSelectedItem(null);
  };

  const getSelectedItemData = () => {
    if (!selectedItem) return null;
    return (calendarData as any[]).find(item => {
      if (viewMode === 'day') return item.date === selectedItem;
      if (viewMode === 'month') return `${item.year}-${item.month}` === selectedItem;
      return item.year.toString() === selectedItem;
    });
  };

  const selectedItemData = getSelectedItemData();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (!state.transactions.length) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <p className="text-gray-500">No transaction data to display in heatmap</p>
        </div>
      </div>
    );
  }

  const getTitle = () => {
    if (viewMode === 'day') {
      return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    } else if (viewMode === 'month') {
      return currentDate.getFullYear().toString();
    } else {
      const startYear = Math.min(new Date().getFullYear() - 5, currentDate.getFullYear() - 2);
      const endYear = Math.max(new Date().getFullYear(), currentDate.getFullYear() + 2);
      return `${startYear} - ${endYear}`;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Spending Heatmap</h3>
              <p className="text-sm text-gray-600">
                {viewMode === 'day' ? 'Daily' : viewMode === 'month' ? 'Monthly' : 'Yearly'} spending intensity view
              </p>
            </div>
          </div>
          
          {/* View Mode Selector */}
          <div className="flex space-x-2">
            {[
              { key: 'day', label: 'Day' },
              { key: 'month', label: 'Month' },
              { key: 'year', label: 'Year' }
            ].map(mode => (
              <button
                key={mode.key}
                onClick={() => setViewMode(mode.key as ViewMode)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === mode.key
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Data Mode Selector */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex space-x-2">
            {[
              { key: 'spending', label: 'Spending', color: 'red' },
              { key: 'income', label: 'Income', color: 'green' },
              { key: 'net', label: 'Net', color: 'blue' }
            ].map(mode => (
              <button
                key={mode.key}
                onClick={() => setDataMode(mode.key as DataMode)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  dataMode === mode.key
                    ? `bg-${mode.color}-600 text-white`
                    : `bg-gray-200 text-gray-700 hover:bg-gray-300`
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
          
          {/* Rent Exclusion Toggle */}
          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={excludeRent}
                onChange={(e) => setExcludeRent(e.target.checked)}
                className="text-purple-600 focus:ring-purple-500 rounded"
              />
              <span className="text-sm text-gray-700">Exclude rent/housing expenses</span>
            </label>
          </div>
          
          {/* Navigation */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('prev')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            
            <h4 className="text-xl font-semibold text-gray-900 min-w-[200px] text-center">
              {getTitle()}
            </h4>
            
            <button
              onClick={() => navigate('next')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        {viewMode === 'day' && (
          <div className="grid grid-cols-7 gap-1 mb-4">
            {/* Week day headers */}
            {weekDays.map(day => (
              <div key={day} className="h-8 flex items-center justify-center text-sm font-medium text-gray-600">
                {day}
              </div>
            ))}
            
            {/* Calendar days */}
            {(calendarData as DayData[]).map((day, index) => {
              const dayNum = new Date(day.date).getDate();
              const isSelected = selectedItem === day.date;
              
              return (
                <div
                  key={index}
                  onClick={() => !day.isEmpty && setSelectedItem(day.date)}
                  className={`
                    h-12 flex items-center justify-center text-sm relative cursor-pointer
                    ${day.isEmpty ? 'bg-gray-50 text-gray-400' : 'border border-gray-200 hover:border-gray-300'}
                    ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                  `}
                  style={getCellBackground(day)}
                  title={day.isEmpty ? '' : `${formatDate(day.date)}: ${formatMoney(
                    dataMode === 'spending' ? day.spending : 
                    dataMode === 'income' ? day.income : day.net
                  )}`}
                >
                  <span className={`${day.isEmpty ? '' : 'font-medium'}`}>
                    {dayNum}
                  </span>
                  {!day.isEmpty && day.transactions.length > 0 && (
                    <div className="absolute bottom-0.5 right-0.5 w-1 h-1 bg-gray-600 rounded-full opacity-60"></div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Month Grid */}
        {viewMode === 'month' && (
          <div className="grid grid-cols-3 gap-4 mb-4">
            {(calendarData as MonthData[]).map((month, index) => {
              const isSelected = selectedItem === `${month.year}-${month.month}`;
              
              return (
                <div
                  key={index}
                  onClick={() => setSelectedItem(`${month.year}-${month.month}`)}
                  className={`
                    p-4 rounded-lg cursor-pointer border border-gray-200 hover:border-gray-300 transition-colors
                    ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                  `}
                  style={getCellBackground(month)}
                  title={`${month.month} ${month.year}: ${formatMoney(
                    dataMode === 'spending' ? month.spending : 
                    dataMode === 'income' ? month.income : month.net
                  )}`}
                >
                  <div className="text-center">
                    <div className="font-medium text-gray-900">{month.month}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {formatMoney(
                        dataMode === 'spending' ? month.spending : 
                        dataMode === 'income' ? month.income : month.net
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {month.transactions.length} transactions
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Year Grid */}
        {viewMode === 'year' && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            {(calendarData as YearData[]).map((year, index) => {
              const isSelected = selectedItem === year.year.toString();
              
              return (
                <div
                  key={index}
                  onClick={() => setSelectedItem(year.year.toString())}
                  className={`
                    p-6 rounded-lg cursor-pointer border border-gray-200 hover:border-gray-300 transition-colors
                    ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                  `}
                  style={getCellBackground(year)}
                  title={`${year.year}: ${formatMoney(
                    dataMode === 'spending' ? year.spending : 
                    dataMode === 'income' ? year.income : year.net
                  )}`}
                >
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{year.year}</div>
                    <div className="text-lg text-gray-700 mt-2">
                      {formatMoney(
                        dataMode === 'spending' ? year.spending : 
                        dataMode === 'income' ? year.income : year.net
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {year.transactions.length} transactions
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {year.monthsWithTransactions} active months
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>Less</span>
          <div className="flex space-x-1">
            {Array.from({ length: 5 }, (_, i) => {
              const intensity = (i + 1) / 5;
              const color = dataMode === 'spending' ? '239, 68, 68' : 
                           dataMode === 'income' ? '34, 197, 94' : '59, 130, 246';
              return (
                <div
                  key={i}
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: `rgba(${color}, ${0.1 + intensity * 0.7})` }}
                ></div>
              );
            })}
          </div>
          <span>More</span>
        </div>
      </div>

      {/* Selected Item Details */}
      {selectedItemData && selectedItemData.transactions.length > 0 && (
        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <Eye className="h-5 w-5 text-blue-600" />
            <h4 className="text-lg font-semibold text-gray-900">
              {viewMode === 'day' ? formatDate(selectedItemData.date) :
               viewMode === 'month' ? `${selectedItemData.month} ${selectedItemData.year}` :
               selectedItemData.year}
            </h4>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-600 font-medium">Spending</p>
              <p className="text-lg font-bold text-red-700">{formatMoney(selectedItemData.spending)}</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600 font-medium">Income</p>
              <p className="text-lg font-bold text-green-700">{formatMoney(selectedItemData.income)}</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">Net</p>
              <p className={`text-lg font-bold ${selectedItemData.net >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                {formatMoney(selectedItemData.net)}
              </p>
            </div>
          </div>

          {/* Transactions List */}
          <div>
            <h5 className="font-medium text-gray-900 mb-3">
              Transactions ({selectedItemData.transactions.length})
            </h5>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {selectedItemData.transactions.slice(0, 10).map((transaction: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium text-gray-900">{transaction.description}</p>
                    {transaction.category && (
                      <p className="text-sm text-gray-600">{transaction.category}</p>
                    )}
                  </div>
                  <span className={`font-semibold ${
                    transaction.isIncome ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.isIncome ? '+' : ''}{formatMoney(transaction.money)}
                  </span>
                </div>
              ))}
              {selectedItemData.transactions.length > 10 && (
                <div className="text-center text-sm text-gray-500 pt-2">
                  ... and {selectedItemData.transactions.length - 10} more transactions
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpendingHeatmap;