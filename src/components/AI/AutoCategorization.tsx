import React, { useState } from 'react';
import { Brain, Zap, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import { useAppContext, appActions } from '../../context/AppContext';
import { formatMoney, formatDate } from '../../utils/csvParser';
import { getCategoryColor } from '../../utils/calculations';
import { geminiService } from '../../services/geminiService';
import { storage } from '../../utils/storage';

interface CategorizationRule {
  id: string;
  pattern: string;
  category: string;
  confidence: number;
  description: string;
}

const AutoCategorization: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [suggestions, setSuggestions] = useState<Array<{
    transactionId: string;
    suggestedCategory: string;
    confidence: number;
    reason: string;
  }>>([]);
  const [apiError, setApiError] = useState<string | null>(null);

  // Predefined categorization rules
  const categorizationRules: CategorizationRule[] = [
    // Income
    { id: '1', pattern: 'salary', category: 'Income', confidence: 0.95, description: 'Salary payment' },
    { id: '2', pattern: 'deposit', category: 'Income', confidence: 0.80, description: 'Bank deposit' },
    { id: '3', pattern: 'refund', category: 'Income', confidence: 0.85, description: 'Refund payment' },
    { id: '4', pattern: 'transfer in', category: 'Income', confidence: 0.70, description: 'Incoming transfer' },
    
    // Groceries
    { id: '5', pattern: 'coles', category: 'Groceries', confidence: 0.95, description: 'Supermarket purchase' },
    { id: '6', pattern: 'woolworths', category: 'Groceries', confidence: 0.95, description: 'Supermarket purchase' },
    { id: '7', pattern: 'aldi', category: 'Groceries', confidence: 0.95, description: 'Supermarket purchase' },
    { id: '8', pattern: 'iga', category: 'Groceries', confidence: 0.90, description: 'Supermarket purchase' },
    { id: '9', pattern: 'food', category: 'Groceries', confidence: 0.85, description: 'Food-related purchase' },
    { id: '10', pattern: 'grocery', category: 'Groceries', confidence: 0.90, description: 'Grocery store' },
    { id: '11', pattern: 'supermarket', category: 'Groceries', confidence: 0.95, description: 'Supermarket purchase' },
    
    // Dining
    { id: '12', pattern: 'restaurant', category: 'Dining', confidence: 0.90, description: 'Restaurant dining' },
    { id: '13', pattern: 'cafe', category: 'Dining', confidence: 0.85, description: 'Cafe visit' },
    { id: '14', pattern: 'mcdonalds', category: 'Dining', confidence: 0.95, description: 'Fast food' },
    { id: '15', pattern: 'kfc', category: 'Dining', confidence: 0.95, description: 'Fast food' },
    { id: '16', pattern: 'subway', category: 'Dining', confidence: 0.95, description: 'Fast food' },
    { id: '17', pattern: 'pizza', category: 'Dining', confidence: 0.80, description: 'Pizza purchase' },
    { id: '18', pattern: 'dinner', category: 'Dining', confidence: 0.85, description: 'Dinner out' },
    { id: '19', pattern: 'lunch', category: 'Dining', confidence: 0.85, description: 'Lunch out' },
    { id: '20', pattern: 'burger', category: 'Dining', confidence: 0.80, description: 'Fast food' },
    
    // Transportation
    { id: '21', pattern: 'uber', category: 'Transportation', confidence: 0.95, description: 'Ride sharing' },
    { id: '22', pattern: 'taxi', category: 'Transportation', confidence: 0.90, description: 'Taxi service' },
    { id: '23', pattern: 'petrol', category: 'Transportation', confidence: 0.95, description: 'Fuel purchase' },
    { id: '24', pattern: 'gas', category: 'Transportation', confidence: 0.95, description: 'Fuel purchase' },
    { id: '25', pattern: 'fuel', category: 'Transportation', confidence: 0.95, description: 'Fuel purchase' },
    { id: '26', pattern: 'parking', category: 'Transportation', confidence: 0.90, description: 'Parking fee' },
    { id: '27', pattern: 'toll', category: 'Transportation', confidence: 0.95, description: 'Road toll' },
    { id: '28', pattern: 'public transport', category: 'Transportation', confidence: 0.90, description: 'Public transport' },
    { id: '29', pattern: 'bus', category: 'Transportation', confidence: 0.85, description: 'Bus fare' },
    { id: '30', pattern: 'train', category: 'Transportation', confidence: 0.85, description: 'Train fare' },
    
    // Shopping
    { id: '31', pattern: 'amazon', category: 'Shopping', confidence: 0.90, description: 'Online shopping' },
    { id: '32', pattern: 'ebay', category: 'Shopping', confidence: 0.90, description: 'Online shopping' },
    { id: '33', pattern: 'target', category: 'Shopping', confidence: 0.85, description: 'Retail shopping' },
    { id: '34', pattern: 'kmart', category: 'Shopping', confidence: 0.85, description: 'Retail shopping' },
    { id: '35', pattern: 'big w', category: 'Shopping', confidence: 0.85, description: 'Retail shopping' },
    { id: '36', pattern: 'myer', category: 'Shopping', confidence: 0.85, description: 'Department store' },
    { id: '37', pattern: 'david jones', category: 'Shopping', confidence: 0.85, description: 'Department store' },
    { id: '38', pattern: 'online shopping', category: 'Shopping', confidence: 0.85, description: 'Online purchase' },
    { id: '39', pattern: 'retail', category: 'Shopping', confidence: 0.80, description: 'Retail purchase' },
    
    // Entertainment
    { id: '40', pattern: 'netflix', category: 'Entertainment', confidence: 0.95, description: 'Streaming service' },
    { id: '41', pattern: 'spotify', category: 'Entertainment', confidence: 0.95, description: 'Music streaming' },
    { id: '42', pattern: 'youtube', category: 'Entertainment', confidence: 0.90, description: 'Video streaming' },
    { id: '43', pattern: 'disney', category: 'Entertainment', confidence: 0.95, description: 'Streaming service' },
    { id: '44', pattern: 'cinema', category: 'Entertainment', confidence: 0.90, description: 'Movie theater' },
    { id: '45', pattern: 'movie', category: 'Entertainment', confidence: 0.85, description: 'Movie purchase' },
    { id: '46', pattern: 'game', category: 'Entertainment', confidence: 0.85, description: 'Gaming purchase' },
    { id: '47', pattern: 'streaming', category: 'Entertainment', confidence: 0.85, description: 'Streaming service' },
    
    // Utilities
    { id: '48', pattern: 'electricity', category: 'Utilities', confidence: 0.95, description: 'Electricity bill' },
    { id: '49', pattern: 'gas bill', category: 'Utilities', confidence: 0.95, description: 'Gas bill' },
    { id: '50', pattern: 'water', category: 'Utilities', confidence: 0.95, description: 'Water bill' },
    { id: '51', pattern: 'internet', category: 'Utilities', confidence: 0.95, description: 'Internet service' },
    { id: '52', pattern: 'phone', category: 'Utilities', confidence: 0.90, description: 'Phone bill' },
    { id: '53', pattern: 'mobile', category: 'Utilities', confidence: 0.90, description: 'Mobile service' },
    { id: '54', pattern: 'utility', category: 'Utilities', confidence: 0.85, description: 'Utility bill' },
    
    // Healthcare
    { id: '55', pattern: 'pharmacy', category: 'Healthcare', confidence: 0.90, description: 'Pharmacy purchase' },
    { id: '56', pattern: 'chemist', category: 'Healthcare', confidence: 0.90, description: 'Pharmacy purchase' },
    { id: '57', pattern: 'doctor', category: 'Healthcare', confidence: 0.85, description: 'Medical appointment' },
    { id: '58', pattern: 'dental', category: 'Healthcare', confidence: 0.90, description: 'Dental care' },
    { id: '59', pattern: 'medical', category: 'Healthcare', confidence: 0.85, description: 'Medical expense' },
    { id: '60', pattern: 'health', category: 'Healthcare', confidence: 0.80, description: 'Health-related expense' },
    
    // Insurance
    { id: '61', pattern: 'insurance', category: 'Insurance', confidence: 0.95, description: 'Insurance payment' },
    { id: '62', pattern: 'car insurance', category: 'Insurance', confidence: 0.95, description: 'Car insurance' },
    { id: '63', pattern: 'health insurance', category: 'Insurance', confidence: 0.95, description: 'Health insurance' },
    { id: '64', pattern: 'life insurance', category: 'Insurance', confidence: 0.95, description: 'Life insurance' },
    { id: '65', pattern: 'home insurance', category: 'Insurance', confidence: 0.95, description: 'Home insurance' },
    
    // Education
    { id: '66', pattern: 'course', category: 'Education', confidence: 0.90, description: 'Educational course' },
    { id: '67', pattern: 'book', category: 'Education', confidence: 0.80, description: 'Educational book' },
    { id: '68', pattern: 'training', category: 'Education', confidence: 0.85, description: 'Training program' },
    { id: '69', pattern: 'school', category: 'Education', confidence: 0.85, description: 'School expense' },
    { id: '70', pattern: 'university', category: 'Education', confidence: 0.85, description: 'University expense' },
    { id: '71', pattern: 'education', category: 'Education', confidence: 0.80, description: 'Educational expense' },
    
    // Travel
    { id: '72', pattern: 'flight', category: 'Travel', confidence: 0.95, description: 'Flight booking' },
    { id: '73', pattern: 'hotel', category: 'Travel', confidence: 0.95, description: 'Hotel booking' },
    { id: '74', pattern: 'airbnb', category: 'Travel', confidence: 0.95, description: 'Accommodation' },
    { id: '75', pattern: 'vacation', category: 'Travel', confidence: 0.90, description: 'Vacation expense' },
    { id: '76', pattern: 'travel', category: 'Travel', confidence: 0.85, description: 'Travel expense' },
    { id: '77', pattern: 'booking', category: 'Travel', confidence: 0.80, description: 'Travel booking' },
    
    // Home
    { id: '78', pattern: 'furniture', category: 'Home', confidence: 0.90, description: 'Furniture purchase' },
    { id: '79', pattern: 'repair', category: 'Home', confidence: 0.85, description: 'Home repair' },
    { id: '80', pattern: 'maintenance', category: 'Home', confidence: 0.85, description: 'Home maintenance' },
    { id: '81', pattern: 'home', category: 'Home', confidence: 0.80, description: 'Home-related expense' },
    { id: '82', pattern: 'house', category: 'Home', confidence: 0.80, description: 'House-related expense' },
    { id: '83', pattern: 'renovation', category: 'Home', confidence: 0.90, description: 'Home renovation' },
    
    // Personal Care
    { id: '84', pattern: 'beauty', category: 'Personal Care', confidence: 0.85, description: 'Beauty product' },
    { id: '85', pattern: 'gym', category: 'Personal Care', confidence: 0.90, description: 'Gym membership' },
    { id: '86', pattern: 'wellness', category: 'Personal Care', confidence: 0.80, description: 'Wellness expense' },
    { id: '87', pattern: 'spa', category: 'Personal Care', confidence: 0.85, description: 'Spa treatment' },
    { id: '88', pattern: 'salon', category: 'Personal Care', confidence: 0.85, description: 'Hair salon' },
    { id: '89', pattern: 'fitness', category: 'Personal Care', confidence: 0.85, description: 'Fitness expense' },
    
    // Gifts
    { id: '90', pattern: 'gift', category: 'Gifts', confidence: 0.85, description: 'Gift purchase' },
    { id: '91', pattern: 'present', category: 'Gifts', confidence: 0.85, description: 'Gift purchase' },
    
    // Investment
    { id: '92', pattern: 'investment', category: 'Investment', confidence: 0.95, description: 'Investment transaction' },
    { id: '93', pattern: 'stock', category: 'Investment', confidence: 0.95, description: 'Stock purchase' },
    { id: '94', pattern: 'bond', category: 'Investment', confidence: 0.95, description: 'Bond purchase' },
    { id: '95', pattern: 'crypto', category: 'Investment', confidence: 0.95, description: 'Cryptocurrency transaction' },
    { id: '96', pattern: 'bitcoin', category: 'Investment', confidence: 0.95, description: 'Bitcoin transaction' },
    { id: '97', pattern: 'ethereum', category: 'Investment', confidence: 0.95, description: 'Ethereum transaction' },
    { id: '98', pattern: 'trading', category: 'Investment', confidence: 0.90, description: 'Trading transaction' },
    { id: '99', pattern: 'broker', category: 'Investment', confidence: 0.90, description: 'Brokerage transaction' },
    { id: '100', pattern: 'portfolio', category: 'Investment', confidence: 0.85, description: 'Portfolio transaction' },
    { id: '101', pattern: 'fund', category: 'Investment', confidence: 0.90, description: 'Investment fund' },
    { id: '102', pattern: 'etf', category: 'Investment', confidence: 0.95, description: 'ETF transaction' },
    { id: '103', pattern: 'mutual fund', category: 'Investment', confidence: 0.95, description: 'Mutual fund transaction' },
    
    // Donations
    { id: '104', pattern: 'donation', category: 'Donations', confidence: 0.95, description: 'Charitable donation' },
    { id: '105', pattern: 'charity', category: 'Donations', confidence: 0.95, description: 'Charitable donation' },
    { id: '106', pattern: 'charitable', category: 'Donations', confidence: 0.90, description: 'Charitable giving' },
    { id: '107', pattern: 'foundation', category: 'Donations', confidence: 0.90, description: 'Foundation donation' },
    { id: '108', pattern: 'ngo', category: 'Donations', confidence: 0.90, description: 'NGO donation' },
    { id: '109', pattern: 'nonprofit', category: 'Donations', confidence: 0.90, description: 'Nonprofit donation' },
    { id: '110', pattern: 'red cross', category: 'Donations', confidence: 0.95, description: 'Red Cross donation' },
    { id: '111', pattern: 'unicef', category: 'Donations', confidence: 0.95, description: 'UNICEF donation' },
    { id: '112', pattern: 'world vision', category: 'Donations', confidence: 0.95, description: 'World Vision donation' },
    { id: '113', pattern: 'salvation army', category: 'Donations', confidence: 0.95, description: 'Salvation Army donation' },
    
    // Subscriptions
    { id: '114', pattern: 'subscription', category: 'Subscriptions', confidence: 0.90, description: 'Subscription service' },
    { id: '115', pattern: 'monthly', category: 'Subscriptions', confidence: 0.80, description: 'Monthly subscription' },
    { id: '116', pattern: 'recurring', category: 'Subscriptions', confidence: 0.85, description: 'Recurring service' },
    { id: '117', pattern: 'membership', category: 'Subscriptions', confidence: 0.85, description: 'Membership fee' },
  ];

  const analyzeTransaction = (transaction: any): { category: string; confidence: number; reason: string } => {
    const description = transaction.description.toLowerCase();
    
    // Find matching rules
    const matches = categorizationRules
      .filter(rule => description.includes(rule.pattern.toLowerCase()))
      .sort((a, b) => b.confidence - a.confidence);

    if (matches.length > 0) {
      const bestMatch = matches[0];
      return {
        category: bestMatch.category,
        confidence: bestMatch.confidence,
        reason: bestMatch.description
      };
    }

    // Fallback analysis based on amount patterns
    const amount = Math.abs(transaction.money);
    
    if (transaction.isIncome) {
      return { category: 'Income', confidence: 0.95, reason: 'Income transaction' };
    }
    
    if (amount < 10) {
      return { category: 'Small Purchases', confidence: 0.60, reason: 'Small amount transaction' };
    }
    
    if (amount > 1000) {
      return { category: 'Large Purchases', confidence: 0.70, reason: 'Large amount transaction' };
    }

    return { category: 'Uncategorized', confidence: 0.0, reason: 'No pattern match found' };
  };

  const processTransactions = async () => {
    setIsProcessing(true);
    setProcessedCount(0);
    setSuggestions([]);
    setApiError(null);

    const uncategorizedTransactions = state.transactions.filter(t => !t.category);
    
    if (uncategorizedTransactions.length === 0) {
      setIsProcessing(false);
      return;
    }

    // Check if we have recent data in localStorage
    const hasRecentData = storage.hasRecentData();
    if (hasRecentData) {
      console.log('Using cached categorization data from localStorage');
    }

    try {
      // Debug: Log transactions with PayPal data
      const transactionsWithPayPal = uncategorizedTransactions.filter(t => t.paypalData);
      console.log('Transactions with PayPal data:', transactionsWithPayPal.length);
      transactionsWithPayPal.forEach(t => {
        console.log('PayPal transaction:', {
          id: t.id,
          description: t.description,
          paypalData: t.paypalData
        });
      });

      // Use Gemini service for AI categorization with progress tracking
      const newSuggestions = await geminiService.categorizeBatch(
        uncategorizedTransactions.map(t => ({
          id: t.id,
          description: t.description,
          money: t.money,
          paypalData: t.paypalData
        })),
        (processed) => {
          setProcessedCount(processed);
        }
      );

      // Filter suggestions with confidence > 0.5
      const filteredSuggestions = newSuggestions.filter(s => s.confidence > 0.5);
      setSuggestions(filteredSuggestions);
    } catch (error) {
      console.error('AI categorization error:', error);
      setApiError('Failed to connect to AI service. Please check your API key and try again.');
      
      // Fallback to pattern-based categorization
      const fallbackSuggestions: Array<{
        transactionId: string;
        suggestedCategory: string;
        confidence: number;
        reason: string;
      }> = [];

      for (let i = 0; i < uncategorizedTransactions.length; i++) {
        const transaction = uncategorizedTransactions[i];
        const analysis = analyzeTransaction(transaction);
        
        if (analysis.confidence > 0.5) {
          fallbackSuggestions.push({
            transactionId: transaction.id,
            suggestedCategory: analysis.category,
            confidence: analysis.confidence,
            reason: analysis.reason
          });
        }

        setProcessedCount(i + 1);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      setSuggestions(fallbackSuggestions);
    }

    setIsProcessing(false);
  };

  const applyAllSuggestions = () => {
    suggestions.forEach(suggestion => {
      const transaction = state.transactions.find(t => t.id === suggestion.transactionId);
      if (transaction) {
        const updatedTransaction = { ...transaction, category: suggestion.suggestedCategory };
        dispatch(appActions.updateTransaction(updatedTransaction));
      }
    });
    setSuggestions([]);
  };

  const applySuggestion = (transactionId: string, category: string) => {
    const transaction = state.transactions.find(t => t.id === transactionId);
    if (transaction) {
      const updatedTransaction = { ...transaction, category };
      dispatch(appActions.updateTransaction(updatedTransaction));
      setSuggestions(suggestions.filter(s => s.transactionId !== transactionId));
    }
  };

  const uncategorizedCount = state.transactions.filter(t => !t.category).length;
  const categorizedCount = state.transactions.filter(t => t.category).length;

  return (
    <div className="space-y-6">
      {/* AI Categorization Header */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Brain className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Auto-Categorization</h3>
            <p className="text-sm text-gray-600">
              Automatically categorize transactions using pattern matching and smart rules
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Total Transactions</p>
            <p className="text-xl font-bold text-gray-900">{state.transactions.length}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Categorized</p>
            <p className="text-xl font-bold text-green-600">{categorizedCount}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Uncategorized</p>
            <p className="text-xl font-bold text-orange-600">{uncategorizedCount}</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* API Key Status */}
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${import.meta.env.VITE_GEMINI_API_KEY ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              {import.meta.env.VITE_GEMINI_API_KEY ? 'AI Service Connected' : 'AI Service Not Available'}
            </span>
          </div>

          {/* Storage Status */}
          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${storage.hasRecentData() ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <span className="text-sm text-blue-800">
                {storage.hasRecentData() ? 'Cached Data Available' : 'No Cached Data'}
              </span>
            </div>
            <button
              onClick={() => {
                storage.clearData();
                window.location.reload();
              }}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Clear Cache
            </button>
          </div>

          {/* Error Message */}
          {apiError && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-sm text-red-800">{apiError}</span>
            </div>
          )}

          <div className="flex items-center space-x-4">
            <button
              onClick={processTransactions}
              disabled={isProcessing || uncategorizedCount === 0}
              className="btn-primary flex items-center space-x-2"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              <span>
                {isProcessing ? `Processing... (${processedCount}/${uncategorizedCount})` : 'Analyze with AI'}
              </span>
            </button>

            {suggestions.length > 0 && (
              <button
                onClick={applyAllSuggestions}
                className="btn-primary flex items-center space-x-2 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Apply All Suggestions ({suggestions.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Processing Status */}
      {isProcessing && (
        <div className="card">
          <div className="flex items-center space-x-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <div className="flex-1">
              <p className="font-medium text-gray-900">Processing transactions with AI (batched)...</p>
              <p className="text-sm text-gray-600">
                Analyzed {processedCount} of {uncategorizedCount} transactions
              </p>
              {uncategorizedCount > 0 && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(processedCount / uncategorizedCount) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.round((processedCount / uncategorizedCount) * 100)}% complete
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            AI Suggestions ({suggestions.length} recommendations)
          </h3>
          
          <div className="space-y-3">
            {suggestions.map((suggestion) => {
              const transaction = state.transactions.find(t => t.id === suggestion.transactionId);
              if (!transaction) return null;

              return (
                <div key={suggestion.transactionId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600">{formatDate(transaction.date)}</span>
                      <span className={`font-medium ${transaction.isIncome ? 'text-green-600' : 'text-red-600'}`}>
                        {formatMoney(transaction.money)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{transaction.description}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getCategoryColor(suggestion.suggestedCategory) }}
                      ></div>
                      <span className="text-sm font-medium text-gray-700">{suggestion.suggestedCategory}</span>
                      <span className="text-xs text-gray-500">({(suggestion.confidence * 100).toFixed(0)}% confidence)</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{suggestion.reason}</p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => applySuggestion(suggestion.transactionId, suggestion.suggestedCategory)}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Storage Statistics */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Storage Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-600">Transactions</p>
            <p className="text-lg font-semibold text-blue-900">{state.transactions.length}</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-600">Categorized</p>
            <p className="text-lg font-semibold text-green-900">
              {state.transactions.filter(t => t.category).length}
            </p>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <p className="text-sm text-purple-600">Categories</p>
            <p className="text-lg font-semibold text-purple-900">{state.categories.length}</p>
          </div>
          <div className="p-3 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-600">Cache Status</p>
            <p className={`text-lg font-semibold ${storage.hasRecentData() ? 'text-green-900' : 'text-yellow-900'}`}>
              {storage.hasRecentData() ? 'Recent' : 'Stale'}
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Data is automatically saved to your browser's local storage
          </p>
          <button
            onClick={() => {
              storage.clearData();
              window.location.reload();
            }}
            className="text-sm text-red-600 hover:text-red-800 underline"
          >
            Clear All Data
          </button>
        </div>
      </div>

      {/* Categorization Rules */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Categorization Rules</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categorizationRules.slice(0, 15).map((rule) => (
            <div key={rule.id} className="p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getCategoryColor(rule.category) }}
                ></div>
                <span className="font-medium text-sm">{rule.category}</span>
                <span className="text-xs text-gray-500">({(rule.confidence * 100).toFixed(0)}%)</span>
              </div>
              <p className="text-xs text-gray-600">Pattern: "{rule.pattern}"</p>
              <p className="text-xs text-gray-500">{rule.description}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-4">
          Showing first 15 rules. Total: {categorizationRules.length} patterns
        </p>
      </div>
    </div>
  );
};

export default AutoCategorization; 