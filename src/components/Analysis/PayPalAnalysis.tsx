import React, { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Link } from 'lucide-react';
import { useAppContext, appActions } from '../../context/AppContext';
import { parsePayPalCSV, matchPayPalTransactions, PayPalTransaction, TransactionMatch } from '../../utils/paypalParser';
import { formatMoney } from '../../utils/csvParser';

// Helper function to format dates consistently (DD/MM/YYYY)
const formatDateConsistent = (dateStr: string): string => {
  if (!dateStr) return 'N/A';
  
  // Handle DD/MM/YYYY format (PayPal dates)
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${day}/${month}/${year}`;
  }
  
  // Handle standard date format (bank dates)
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date format: "${dateStr}"`);
      return 'N/A';
    }
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.warn(`Error parsing date "${dateStr}":`, error);
    return dateStr;
  }
};

const PayPalAnalysis: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [paypalTransactions, setPaypalTransactions] = useState<PayPalTransaction[]>([]);
  const [matches, setMatches] = useState<TransactionMatch[]>([]);
  const [uncategorizedPayPal, setUncategorizedPayPal] = useState<PayPalTransaction[]>([]);
  const [showApplySuccess, setShowApplySuccess] = useState<boolean>(false);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setUploadStatus('error');
      return;
    }

    try {
      setUploadStatus('uploading');
      const transactions = await parsePayPalCSV(file);
      
      if (transactions.length === 0) {
        setUploadStatus('error');
        return;
      }

      // Filter out internal PayPal transfers
      const filteredTransactions = transactions.filter(tx => 
        tx.type !== 'Transfer to PayPal account' && 
        tx.type !== 'User Initiated Withdrawal' &&
        tx.type !== 'General Currency Conversion'
      );
      
      setPaypalTransactions(filteredTransactions);
      
      // Match with existing bank transactions
      if (state.transactions.length > 0) {
        const matchedTransactions = matchPayPalTransactions(state.transactions, filteredTransactions);
        setMatches(matchedTransactions);
        
        // Find uncategorized PayPal transactions (those with low confidence or no matches)
        const matchedPayPalIds = new Set(matchedTransactions.map(match => match.paypalTransaction.transactionId));
        const uncategorized = filteredTransactions.filter(tx => !matchedPayPalIds.has(tx.transactionId));
        setUncategorizedPayPal(uncategorized);
      }
      
      setUploadStatus('success');
      setTimeout(() => setUploadStatus('idle'), 3000);
      
    } catch (error) {
      console.error('PayPal parsing error:', error);
      setUploadStatus('error');
    }
  }, [state.transactions]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const applyPayPalData = useCallback((match: TransactionMatch) => {
    const updatedTransaction = {
      ...match.bankTransaction,
      description: `${match.bankTransaction.description} | PayPal: ${match.paypalTransaction.name} (${match.paypalTransaction.type})`,
      paypalData: {
        name: match.paypalTransaction.name,
        type: match.paypalTransaction.type,
        transactionId: match.paypalTransaction.transactionId,
        receiptId: match.paypalTransaction.receiptId,
        itemTitle: match.paypalTransaction.itemTitle,
        confidence: match.confidence,
        reason: match.reason
      }
    };

    dispatch(appActions.updateTransaction(updatedTransaction));
  }, [dispatch]);

  const applyAllPayPalData = useCallback(() => {
    matches.forEach(match => {
      applyPayPalData(match);
    });
    // Clear all matches after applying them
    setMatches([]);
    // Show success message
    setShowApplySuccess(true);
    setTimeout(() => setShowApplySuccess(false), 3000);
  }, [matches, applyPayPalData]);

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'uploading':
        return <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>;
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-6 w-6 text-red-600" />;
      default:
        return <Upload className="h-6 w-6 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (uploadStatus) {
      case 'uploading':
        return 'Processing PayPal CSV file...';
      case 'success':
        return 'PayPal data uploaded successfully!';
      case 'error':
        return 'Upload failed. Please try again.';
      default:
        return 'Upload your PayPal CSV file';
    }
  };

  if (!state.transactions.length) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <p className="text-gray-500">Please upload bank transaction data first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* PayPal Upload */}
      <div className="card">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            PayPal Transaction Analysis
          </h2>
          <p className="text-gray-600 mb-6">
            Upload your PayPal CSV file to match transactions with your bank data and add detailed descriptions.
          </p>
          
          <div
            className={`border-2 border-dashed rounded-lg p-8 transition-colors duration-200 ${
              isDragOver 
                ? 'border-blue-500 bg-blue-50' 
                : uploadStatus === 'success'
                ? 'border-green-500 bg-green-50'
                : uploadStatus === 'error'
                ? 'border-red-500 bg-red-50'
                : 'border-gray-300 bg-gray-50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center space-y-4">
              {getStatusIcon()}
              
              <div className="text-center">
                <p className={`text-lg font-medium ${
                  uploadStatus === 'success' ? 'text-green-600' :
                  uploadStatus === 'error' ? 'text-red-600' :
                  'text-gray-700'
                }`}>
                  {getStatusText()}
                </p>
                
                {uploadStatus === 'idle' && (
                  <p className="text-sm text-gray-500 mt-2">
                    Supports PayPal CSV files with transaction data
                  </p>
                )}
              </div>
              
              {uploadStatus === 'idle' && (
                <label className="btn-primary cursor-pointer">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  Choose PayPal CSV File
                </label>
              )}
            </div>
          </div>
          
          {paypalTransactions.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span className="text-blue-800 font-medium">
                    {paypalTransactions.length} PayPal transactions loaded
                  </span>
                </div>
                <button
                  onClick={() => {
                    setPaypalTransactions([]);
                    setMatches([]);
                    setUploadStatus('idle');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Clear data
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transaction Matches */}
      {matches.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Transaction Matches ({matches.length} found)
            </h3>
            <button
              onClick={applyAllPayPalData}
              className="btn-primary text-sm"
            >
              Apply All Matches
            </button>
          </div>
          
          {showApplySuccess && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-800 font-medium">
                  Successfully applied {matches.length} PayPal matches to transactions!
                </span>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            {matches.map((match, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Link className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-gray-900">
                      Match #{index + 1} ({Math.round(match.confidence * 100)}% confidence)
                    </span>
                  </div>
                  <button
                    onClick={() => applyPayPalData(match)}
                    className="btn-secondary text-sm"
                  >
                    Apply to Transaction
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Bank Transaction */}
                  <div className="bg-gray-50 p-3 rounded">
                    <h4 className="font-medium text-gray-900 mb-2">Bank Transaction</h4>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">Date:</span> {formatDateConsistent(match.bankTransaction.date)}</p>
                      <p><span className="font-medium">Amount:</span> {formatMoney(match.bankTransaction.money)}</p>
                      <p><span className="font-medium">Description:</span> {match.bankTransaction.description}</p>
                    </div>
                  </div>
                  
                  {/* PayPal Transaction */}
                  <div className="bg-blue-50 p-3 rounded">
                    <h4 className="font-medium text-gray-900 mb-2">PayPal Transaction</h4>
                                         <div className="space-y-1 text-sm">
                       <p><span className="font-medium">Date:</span> {formatDateConsistent(match.paypalTransaction.date)}</p>
                       <p><span className="font-medium">Amount:</span> {formatMoney(match.paypalTransaction.total)}</p>
                       <p><span className="font-medium">Name:</span> {match.paypalTransaction.name}</p>
                       <p><span className="font-medium">Type:</span> {match.paypalTransaction.type}</p>
                       <p><span className="font-medium">Transaction ID:</span> {match.paypalTransaction.transactionId}</p>
                     </div>
                  </div>
                </div>
                
                <div className="mt-3 p-2 bg-yellow-50 rounded text-sm">
                  <span className="font-medium">Match Reason:</span> {match.reason}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unmatched PayPal Transactions */}
      {uncategorizedPayPal.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Unmatched PayPal Transactions ({uncategorizedPayPal.length})
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Transaction ID</th>
                </tr>
              </thead>
              <tbody>
                {uncategorizedPayPal.map((transaction, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 bg-red-50">
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatDateConsistent(transaction.date)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 max-w-xs truncate">
                      {transaction.name || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {transaction.type}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        transaction.status === 'Completed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td className={`py-3 px-4 text-sm font-medium text-right ${
                      transaction.total < 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {formatMoney(transaction.total)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 font-mono">
                      {transaction.transactionId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PayPal Transaction List */}
      {paypalTransactions.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            All PayPal Transactions ({paypalTransactions.length})
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Transaction ID</th>
                </tr>
              </thead>
              <tbody>
                {paypalTransactions.map((transaction, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                                         <td className="py-3 px-4 text-sm text-gray-600">
                       {formatDateConsistent(transaction.date)}
                     </td>
                    <td className="py-3 px-4 text-sm text-gray-900 max-w-xs truncate">
                      {transaction.name || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {transaction.type}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        transaction.status === 'Completed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td className={`py-3 px-4 text-sm font-medium text-right ${
                      transaction.total < 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {formatMoney(transaction.total)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 font-mono">
                      {transaction.transactionId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayPalAnalysis; 