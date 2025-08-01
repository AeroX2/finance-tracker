import React, { useState, useRef } from 'react';
import { Brain, Zap, CheckCircle, Loader2, AlertTriangle, X } from 'lucide-react';
import { useAppContext, appActions } from '../../context/AppContext';
import { formatMoney, formatDate } from '../../utils/csvParser';
import { getCategoryColor } from '../../utils/calculations';
import { geminiService } from '../../services/geminiService';
import { storage } from '../../utils/storage';
import { getStoredApiKey } from './ApiKeyManager';

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
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [analyzeMode, setAnalyzeMode] = useState<'uncategorized' | 'all'>('uncategorized');
  const cancelProcessingRef = useRef(false);

  const stopProcessing = () => {
    cancelProcessingRef.current = true;
    setMessage({ type: 'info', text: 'Stopping AI analysis... keeping current results.' });
    setTimeout(() => setMessage(null), 3000);
  };

  const processTransactions = async () => {
    setIsProcessing(true);
    setProcessedCount(0);
    setSuggestions([]);
    setApiError(null);
    cancelProcessingRef.current = false; // Reset cancellation flag

    

    // Load custom rules from localStorage to pass to AI
    const savedCustomRules = localStorage.getItem('custom-categorization-rules');
    const customRules = savedCustomRules ? JSON.parse(savedCustomRules) : [];
    const activeCustomRules = customRules
      .filter((rule: any) => rule.isActive)
      .map((rule: any) => ({
        pattern: rule.pattern,
        category: rule.category,
        description: rule.description
      }));

    // Get transactions to analyze based on mode
    const transactionsToAnalyze = analyzeMode === 'all' 
      ? state.transactions 
      : state.transactions.filter(t => !t.category);
    
    if (transactionsToAnalyze.length === 0) {
      setIsProcessing(false);
      setMessage({ 
        type: 'info', 
        text: analyzeMode === 'all' ? 'No transactions to analyze' : 'No uncategorized transactions found' 
      });
        setTimeout(() => setMessage(null), 3000);
      return;
    }

    // Check if we have recent data in localStorage
    const hasRecentData = storage.hasRecentData();
    if (hasRecentData) {

    }

    try {


      // Use Gemini service for AI categorization with progress tracking and custom rules
      const newSuggestions = await geminiService.categorizeBatch(
        transactionsToAnalyze.map(t => ({
          id: t.id,
          description: t.description,
          money: t.money,
          paypalData: t.paypalData
        })),
        (processed) => {
          setProcessedCount(processed);
          // Check if processing should be cancelled
          if (cancelProcessingRef.current) {
            throw new Error('PROCESSING_CANCELLED');
          }
        },
        activeCustomRules
      );

      // Filter suggestions with confidence > 0.5
      const filteredSuggestions = newSuggestions.filter(s => s.confidence > 0.5);
      setSuggestions(filteredSuggestions);
      
      if (filteredSuggestions.length > 0) {
        const customRulesText = activeCustomRules.length > 0 ? ` (using ${activeCustomRules.length} custom rules)` : '';
        const modeText = analyzeMode === 'all' ? 'all transactions' : 'uncategorized transactions';
        setMessage({ 
          type: 'success', 
          text: `AI analyzed ${transactionsToAnalyze.length} ${modeText} and generated ${filteredSuggestions.length} suggestions${customRulesText}!` 
        });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error('AI categorization error:', error);
      
      // Handle cancellation differently from other errors
      if (error instanceof Error && error.message === 'PROCESSING_CANCELLED') {
        setMessage({ 
          type: 'info', 
          text: `Processing stopped. Kept ${suggestions.length} suggestions from partial analysis.` 
        });
        setTimeout(() => setMessage(null), 5000);
      } else {
        setApiError('Failed to connect to AI service. Please check your API key and try again.');
      }
    }

    setIsProcessing(false);
    cancelProcessingRef.current = false; // Reset cancellation flag
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
          {/* Message Display */}
          {message && (
            <div className={`p-3 rounded-lg ${
              message.type === 'success' ? 'bg-green-50 border border-green-200' :
              message.type === 'error' ? 'bg-red-50 border border-red-200' :
              'bg-blue-50 border border-blue-200'
            }`}>
              <div className="flex items-center space-x-2">
                {message.type === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
                {message.type === 'error' && <AlertTriangle className="h-5 w-5 text-red-600" />}
                <span className={`text-sm ${
                  message.type === 'success' ? 'text-green-800' :
                  message.type === 'error' ? 'text-red-800' :
                  'text-blue-800'
                }`}>
                  {message.text}
                </span>
              </div>
            </div>
          )}

          {/* API Key Status */}
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getStoredApiKey() ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              {getStoredApiKey() ? 'AI Service Connected' : 'AI Service Not Available - Configure API Key Above'}
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

          {/* Analysis Mode Selection */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h5 className="font-medium text-gray-900 mb-3">Analysis Mode</h5>
            <div className="space-y-2">
              <label className="flex items-center space-x-3">
                <input
                  type="radio"
                  value="uncategorized"
                  checked={analyzeMode === 'uncategorized'}
                  onChange={(e) => setAnalyzeMode(e.target.value as 'uncategorized' | 'all')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">Analyze uncategorized only</span>
                  <p className="text-xs text-gray-500">Only process transactions without categories ({uncategorizedCount} transactions)</p>
                </div>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="radio"
                  value="all"
                  checked={analyzeMode === 'all'}
                  onChange={(e) => setAnalyzeMode(e.target.value as 'uncategorized' | 'all')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">Re-analyze all transactions</span>
                  <p className="text-xs text-gray-500">Process all transactions and replace existing categories ({state.transactions.length} transactions)</p>
                </div>
              </label>
            </div>
            {analyzeMode === 'all' && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-xs text-yellow-800">
                    <p className="font-medium">Warning:</p>
                    <p>This will replace ALL existing categorizations with new AI suggestions. Consider creating a backup first.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={processTransactions}
              disabled={isProcessing || 
                (analyzeMode === 'uncategorized' && uncategorizedCount === 0) || 
                (analyzeMode === 'all' && state.transactions.length === 0) || 
                !getStoredApiKey()}
              className="btn-primary flex items-center space-x-2"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              <span>
                {isProcessing ? 
                  `Processing... (${processedCount}/${analyzeMode === 'all' ? state.transactions.length : uncategorizedCount})` : 
                  'Analyze with AI'}
              </span>
            </button>

            {isProcessing && (
              <button
                onClick={stopProcessing}
                className="btn-secondary flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white border-red-600"
              >
                <X className="h-4 w-4" />
                <span>Stop</span>
              </button>
            )}

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
              <p className="font-medium text-gray-900">
                Processing {analyzeMode === 'all' ? 'all transactions' : 'uncategorized transactions'} with AI (batched)...
              </p>
              <p className="text-sm text-gray-600">
                Analyzed {processedCount} of {analyzeMode === 'all' ? state.transactions.length : uncategorizedCount} transactions
              </p>
              {(analyzeMode === 'all' ? state.transactions.length : uncategorizedCount) > 0 && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(processedCount / (analyzeMode === 'all' ? state.transactions.length : uncategorizedCount)) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.round((processedCount / (analyzeMode === 'all' ? state.transactions.length : uncategorizedCount)) * 100)}% complete
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
            AI Suggestions ({suggestions.length} {analyzeMode === 'all' ? 'categorizations' : 'recommendations'})
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


    </div>
  );
};

export default AutoCategorization; 