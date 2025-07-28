import React, { useState } from 'react';
import { DollarSign, TrendingUp } from 'lucide-react';
import { useAppContext, appActions } from '../context/AppContext';
import { formatMoney } from '../utils/csvParser';

const BalanceInput: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [currentBalance, setCurrentBalance] = useState(state.currentBalance?.toString() || '');
  const [yearlySalary, setYearlySalary] = useState(state.yearlySalary?.toString() || '');

  const handleBalanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const balance = parseFloat(currentBalance);
    if (!isNaN(balance) && balance >= 0) {
      dispatch(appActions.setCurrentBalance(balance));
    }
  };

  const handleSalarySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const salary = parseFloat(yearlySalary);
    if (!isNaN(salary) && salary >= 0) {
      dispatch(appActions.setYearlySalary(salary));
    }
  };





  const weeklyIncomeIncrease = state.yearlySalary ? state.yearlySalary / 52 : 0;
  const monthlyIncomeIncrease = state.yearlySalary ? state.yearlySalary / 12 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Current Balance Input */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <DollarSign className="h-6 w-6 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">Current Balance</h3>
        </div>
        
        <form onSubmit={handleBalanceSubmit} className="space-y-4">
          <div>
            <label htmlFor="balance" className="block text-sm font-medium text-gray-700 mb-1">
              Current Bank Account Balance
            </label>
            <input
              id="balance"
              type="number"
              step="0.01"
              min="0"
              value={currentBalance}
              onChange={(e) => setCurrentBalance(e.target.value)}
              placeholder="Enter your current balance"
              className="input-field"
            />
          </div>
          
          <button type="submit" className="btn-primary w-full">
            Update Balance
          </button>
        </form>

        {state.currentBalance && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-800">
              <span className="font-medium">Current Balance:</span> {formatMoney(state.currentBalance)}
            </p>
          </div>
        )}
      </div>

      {/* Yearly Salary Input */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <TrendingUp className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Yearly Salary</h3>
        </div>
        
        <form onSubmit={handleSalarySubmit} className="space-y-4">
          <div>
            <label htmlFor="salary" className="block text-sm font-medium text-gray-700 mb-1">
              Annual Salary
            </label>
            <input
              id="salary"
              type="number"
              step="0.01"
              min="0"
              value={yearlySalary}
              onChange={(e) => setYearlySalary(e.target.value)}
              placeholder="Enter your yearly salary"
              className="input-field"
            />
          </div>
          
          <button type="submit" className="btn-primary w-full">
            Update Salary
          </button>
        </form>

        {state.yearlySalary && (
          <div className="mt-4 space-y-2">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Weekly Income:</span> {formatMoney(weeklyIncomeIncrease)}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Monthly Income:</span> {formatMoney(monthlyIncomeIncrease)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BalanceInput; 