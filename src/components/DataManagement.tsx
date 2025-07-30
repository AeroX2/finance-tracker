import React, { useState } from 'react';
import { Download, Upload, Database, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAppContext, appActions } from '../context/AppContext';
import { storage } from '../utils/storage';

interface BackupData {
  transactions: any[];
  categories: any[];
  timestamp: string;
  version: string;
  description?: string;
}

const DataManagement: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [uploadMode, setUploadMode] = useState<'replace' | 'combine'>('combine');
  const [backupDescription, setBackupDescription] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const createBackup = () => {
    try {
      const backupData: BackupData = {
        transactions: state.transactions,
        categories: state.categories,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        description: backupDescription || `Backup created on ${new Date().toLocaleString()}`
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `money-analyzer-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: 'Backup created successfully!' });
      setBackupDescription('');
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create backup' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const restoreBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const backupData: BackupData = JSON.parse(e.target?.result as string);
        
        if (uploadMode === 'replace') {
          // Replace all data
          dispatch(appActions.setTransactions(backupData.transactions));
          dispatch(appActions.setCategories(backupData.categories));
          setMessage({ type: 'success', text: `Restored ${backupData.transactions.length} transactions and ${backupData.categories.length} categories` });
        } else {
          // Combine data
          const existingTransactionIds = new Set(state.transactions.map(t => t.id));
          const newTransactions = backupData.transactions.filter(t => !existingTransactionIds.has(t.id));
          
          const existingCategoryIds = new Set(state.categories.map(c => c.id));
          const newCategories = backupData.categories.filter(c => !existingCategoryIds.has(c.id));
          
          const combinedTransactions = [...state.transactions, ...newTransactions];
          const combinedCategories = [...state.categories, ...newCategories];
          
          dispatch(appActions.setTransactions(combinedTransactions));
          dispatch(appActions.setCategories(combinedCategories));
          
          setMessage({ 
            type: 'success', 
            text: `Combined ${newTransactions.length} new transactions and ${newCategories.length} new categories` 
          });
        }
        
        setTimeout(() => setMessage(null), 3000);
      } catch (error) {
        setMessage({ type: 'error', text: 'Invalid backup file format' });
        setTimeout(() => setMessage(null), 3000);
      }
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.json')) {
      setMessage({ type: 'error', text: 'Please upload a JSON backup file' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    restoreBackup(file);
  };

  const clearAllData = () => {
    if (window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      dispatch(appActions.resetState());
      storage.clearData();
      setMessage({ type: 'success', text: 'All data cleared successfully' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const storageInfo = storage.getStorageInfo();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Database className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Data Management</h3>
            <p className="text-sm text-gray-600">
              Backup, restore, and manage your financial data
            </p>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`p-3 rounded-lg mb-4 ${
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

        {/* Current Data Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Total Transactions</p>
            <p className="text-2xl font-bold text-gray-900">{state.transactions.length}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Categories</p>
            <p className="text-2xl font-bold text-gray-900">{state.categories.length}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Storage Status</p>
            <p className={`text-2xl font-bold ${storageInfo.exists ? 'text-green-600' : 'text-yellow-600'}`}>
              {storageInfo.exists ? 'Saved' : 'Not Saved'}
            </p>
          </div>
        </div>
      </div>

      {/* Backup Section */}
      <div className="card">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Create Backup</h4>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Backup Description (Optional)
            </label>
            <input
              type="text"
              value={backupDescription}
              onChange={(e) => setBackupDescription(e.target.value)}
              placeholder="e.g., Monthly backup, Before major changes"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            onClick={createBackup}
            disabled={state.transactions.length === 0}
            className="btn-primary flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Create Backup</span>
          </button>

          {state.transactions.length === 0 && (
            <p className="text-sm text-gray-500">No data to backup</p>
          )}
        </div>
      </div>

      {/* Restore Section */}
      <div className="card">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Restore Backup</h4>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Restore Mode
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="combine"
                  checked={uploadMode === 'combine'}
                  onChange={(e) => setUploadMode(e.target.value as 'replace' | 'combine')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Combine with existing data</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="replace"
                  checked={uploadMode === 'replace'}
                  onChange={(e) => setUploadMode(e.target.value as 'replace' | 'combine')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Replace all data</span>
              </label>
            </div>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-2">
              Drop your backup file here or click to browse
            </p>
            <div className="m-4"></div>
            <input
              type="file"
              accept=".json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
              className="hidden"
              id="backup-file-input"
            />
            <label
              htmlFor="backup-file-input"
              className="btn-primary cursor-pointer"
            >
              Choose Backup File
            </label>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Important:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Combining data will preserve existing categories and add new transactions</li>
                  <li>Replacing data will completely overwrite your current data</li>
                  <li>Always create a backup before restoring</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Storage Statistics */}
      <div className="card">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Storage Statistics</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
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
            <p className={`text-lg font-semibold ${storageInfo.exists ? 'text-green-900' : 'text-yellow-900'}`}>
              {storageInfo.exists ? 'Recent' : 'Stale'}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between">
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

      {/* Data Actions */}
      <div className="card">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Data Actions</h4>
        
        <div className="flex justify-center">
          <button
            onClick={clearAllData}
            className="btn-secondary flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear All Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataManagement; 