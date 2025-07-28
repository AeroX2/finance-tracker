import React, { useState } from 'react';
import { DollarSign, Upload, TrendingUp, List } from 'lucide-react';
import { AppProvider } from './context/AppContext';
import FileUpload from './components/FileUpload';
import BalanceInput from './components/BalanceInput';
import SpendingChart from './components/Charts/SpendingChart';
import SpendingAnalysis from './components/Analysis/SpendingAnalysis';
import CategoryAnalysis from './components/Analysis/CategoryAnalysis';
import TransactionList from './components/Analysis/TransactionList';
import PayPalAnalysis from './components/Analysis/PayPalAnalysis';
import AutoCategorization from './components/AI/AutoCategorization';
import TimePeriodSelector, { TimePeriod } from './components/Analysis/TimePeriodSelector';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'transactions' | 'analysis'>('upload');
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<TimePeriod>('all');

  return (
    <AppProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <DollarSign className="h-8 w-8 text-green-600" />
                <h1 className="text-2xl font-bold text-gray-900">Finance Tracker</h1>
              </div>
              <p className="text-sm text-gray-500">Smart Personal Finance Analysis</p>
            </div>
          </div>
        </header>

        {/* Navigation */}
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8">
              <button
                onClick={() => setActiveTab('upload')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === 'upload'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Upload className="h-4 w-4" />
                <span>Upload Data</span>
              </button>
              <button
                onClick={() => setActiveTab('transactions')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === 'transactions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <List className="h-4 w-4" />
                <span>Transactions</span>
              </button>
              <button
                onClick={() => setActiveTab('analysis')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === 'analysis'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                <span>Analysis</span>
              </button>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'upload' && (
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Welcome to Finance Tracker
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Upload your bank transaction data and get insights into your spending patterns, 
                  trends, and financial health.
                </p>
              </div>
              
              <FileUpload />
              <BalanceInput />
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Financial Analysis
                </h2>
                <p className="text-lg text-gray-600">
                  Explore your spending patterns and financial insights
                </p>
              </div>
              
              {/* Time Period Selector */}
              <TimePeriodSelector 
                selectedPeriod={selectedTimePeriod}
                onPeriodChange={setSelectedTimePeriod}
              />
              
              <div className="space-y-8">
                <div className="card">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Spending Timeline</h3>
                  <SpendingChart type="line" showTrendline={true} timePeriod={selectedTimePeriod} />
                </div>
                
                <div className="card">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Daily Transactions</h3>
                  <SpendingChart type="bar" showTrendline={false} timePeriod={selectedTimePeriod} />
                </div>
              </div>
              
              {/* Spending Analysis */}
              <SpendingAnalysis timePeriod={selectedTimePeriod} />
              
              {/* Category Analysis */}
              <CategoryAnalysis timePeriod={selectedTimePeriod} />
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Transaction Management
                </h2>
                <p className="text-lg text-gray-600">
                  Review, categorize, and manage your transactions
                </p>
              </div>
              
              <AutoCategorization />
              <PayPalAnalysis />
              <TransactionList />
            </div>
          )}


        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <p className="text-sm text-gray-500">
                Finance Tracker - Smart Personal Finance Analysis
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Upload your CSV data in format: "DD/MM/YYYY", "money", "description" (no headers needed)
              </p>
            </div>
          </div>
        </footer>
      </div>
    </AppProvider>
  );
};

export default App;
