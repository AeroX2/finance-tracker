import React, { useCallback, useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Plus, Database } from 'lucide-react';
import { parseCSV } from '../utils/csvParser';
import { useAppContext, appActions } from '../context/AppContext';


const FileUpload: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMode, setUploadMode] = useState<'replace' | 'combine'>('combine');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      dispatch(appActions.setError('Please upload a CSV file'));
      setUploadStatus('error');
      return;
    }

    try {
      setUploadStatus('uploading');
      dispatch(appActions.setLoading(true));
      
      const transactions = await parseCSV(file);
      
      if (transactions.length === 0) {
        dispatch(appActions.setError('No valid transactions found in the CSV file'));
        setUploadStatus('error');
        return;
      }

      if (uploadMode === 'replace') {
        // Replace all data
        dispatch(appActions.setTransactions(transactions));
        setUploadStatus('success');
        setSuccessMessage(`Replaced all data with ${transactions.length} transactions`);
        dispatch(appActions.clearError());
      } else {
        // Combine data - preserve existing categories and add new transactions
        const existingTransactionIds = new Set(state.transactions.map(t => t.id));
        
        const newTransactions = transactions.filter(t => !existingTransactionIds.has(t.id));
        
        if (newTransactions.length === 0) {
          dispatch(appActions.setError('No new transactions found. All transactions already exist.'));
          setUploadStatus('error');
          return;
        }
        
        const combinedTransactions = [...state.transactions, ...newTransactions];
        dispatch(appActions.setTransactions(combinedTransactions));
        setUploadStatus('success');
        
        // Show success message with details
        const skippedCount = transactions.length - newTransactions.length;
        const message = `Added ${newTransactions.length} new transactions${skippedCount > 0 ? `, skipped ${skippedCount} duplicates` : ''}. Total: ${combinedTransactions.length} transactions`;
        setSuccessMessage(message);
        dispatch(appActions.clearError());
      }
      
      // Reset success status after 3 seconds
      setTimeout(() => {
        setUploadStatus('idle');
        setSuccessMessage(null);
      }, 3000);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to parse CSV file';
      dispatch(appActions.setError(errorMessage));
      setUploadStatus('error');
    }
  }, [dispatch, uploadMode, state.transactions]);

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
        return 'Processing CSV file...';
      case 'success':
        return 'File uploaded successfully!';
      case 'error':
        return 'Upload failed. Please try again.';
      default:
        return 'Upload your bank CSV file';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="card">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Upload Your Bank Data
          </h2>
          <p className="text-gray-600 mb-6">
            Drag and drop your CSV file or click to browse. 
            The file should contain data in format: "DD/MM/YYYY", "money", "description" (no headers needed)
          </p>
          
          {/* Upload Mode Selection */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-3">
              <Database className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-800">Upload Mode</span>
            </div>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="combine"
                  checked={uploadMode === 'combine'}
                  onChange={(e) => setUploadMode(e.target.value as 'replace' | 'combine')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-blue-700">Combine with existing data</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="replace"
                  checked={uploadMode === 'replace'}
                  onChange={(e) => setUploadMode(e.target.value as 'replace' | 'combine')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-blue-700">Replace all data</span>
              </label>
            </div>
          </div>
          
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
                     Supports CSV files with "DD/MM/YYYY", "money", "description" format (no headers needed)
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
                  Choose File
                </label>
              )}
            </div>
          </div>
          
          {state.transactions.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span className="text-blue-800 font-medium">
                    {state.transactions.length} transactions loaded
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {successMessage && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-800">{successMessage}</span>
              </div>
              <button
                onClick={() => {
                  setSuccessMessage(null);
                  setUploadStatus('idle');
                }}
                className="mt-2 text-sm text-green-600 hover:text-green-800 underline"
              >
                Dismiss
              </button>
            </div>
          )}
          
          {state.error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="text-red-800">{state.error}</span>
              </div>
              <button
                onClick={() => {
                  dispatch(appActions.clearError());
                  setUploadStatus('idle');
                }}
                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUpload; 