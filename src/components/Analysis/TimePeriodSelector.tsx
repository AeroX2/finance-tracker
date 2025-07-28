import React from 'react';
import { Calendar, Clock } from 'lucide-react';

export type TimePeriod = 'all' | 'day' | 'week' | 'month' | '3months' | '6months' | 'year';

interface TimePeriodSelectorProps {
  selectedPeriod: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
}

const TimePeriodSelector: React.FC<TimePeriodSelectorProps> = ({ selectedPeriod, onPeriodChange }) => {
  const timePeriods = [
    { value: 'all', label: 'All Time', icon: Calendar },
    { value: 'day', label: 'Today', icon: Clock },
    { value: 'week', label: 'This Week', icon: Clock },
    { value: 'month', label: 'This Month', icon: Clock },
    { value: '3months', label: '3 Months', icon: Clock },
    { value: '6months', label: '6 Months', icon: Clock },
    { value: 'year', label: 'This Year', icon: Clock },
  ];

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Time Period</h3>
        </div>
        <div className="flex space-x-2">
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
    </div>
  );
};

export default TimePeriodSelector; 