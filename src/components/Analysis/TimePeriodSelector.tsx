import React from 'react';
import { Calendar, Clock } from 'lucide-react';

export type TimePeriod = 'all' | 'day' | 'week' | 'month' | '3months' | '6months' | 'year' | 'custom';

export interface CustomDateRange {
  startDate: string;
  endDate: string;
}

interface TimePeriodSelectorProps {
  selectedPeriod: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
  customDateRange?: CustomDateRange;
  onCustomDateRangeChange?: (range: CustomDateRange) => void;
}

const TimePeriodSelector: React.FC<TimePeriodSelectorProps> = ({ 
  selectedPeriod, 
  onPeriodChange, 
  customDateRange,
  onCustomDateRangeChange 
}) => {
  const timePeriods = [
    { value: 'all', label: 'All Time', icon: Calendar },
    { value: 'day', label: 'Today', icon: Clock },
    { value: 'week', label: 'This Week', icon: Clock },
    { value: 'month', label: 'This Month', icon: Clock },
    { value: '3months', label: '3 Months', icon: Clock },
    { value: '6months', label: '6 Months', icon: Clock },
    { value: 'year', label: 'This Year', icon: Clock },
    { value: 'custom', label: 'Custom Range', icon: Calendar },
  ];

  const handleCustomDateChange = (field: 'startDate' | 'endDate', value: string) => {
    if (onCustomDateRangeChange && customDateRange) {
      onCustomDateRangeChange({
        ...customDateRange,
        [field]: value
      });
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Time Period</h3>
        </div>
        <div className="flex flex-wrap space-x-2">
          {timePeriods.map((period) => {
            const IconComponent = period.icon;
            return (
              <button
                key={period.value}
                onClick={() => onPeriodChange(period.value as TimePeriod)}
                className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-1 transition-colors ${
                  selectedPeriod === period.value
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                <IconComponent className="h-4 w-4" />
                <span>{period.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      
      {selectedPeriod === 'custom' && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                id="startDate"
                value={customDateRange?.startDate || ''}
                onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                id="endDate"
                value={customDateRange?.endDate || ''}
                onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          {customDateRange?.startDate && customDateRange?.endDate && (
            <p className="mt-2 text-sm text-gray-600">
              Selected range: {new Date(customDateRange.startDate).toLocaleDateString()} - {new Date(customDateRange.endDate).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default TimePeriodSelector; 