import React, { useState } from 'react';
import { Tag, Plus, Trash2 } from 'lucide-react';
import { useAppContext, appActions } from '../../context/AppContext';
import { formatMoney, formatDate } from '../../utils/csvParser';
import { getCategoryColor } from '../../utils/calculations';
import type { Category } from '../../types';

const ManualCategorization: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  const uncategorizedTransactions = state.transactions.filter(t => !t.category);
  const categorizedTransactions = state.transactions.filter(t => t.category);

  const handleCategorizeTransaction = (transactionId: string, category: string) => {
    const transaction = state.transactions.find(t => t.id === transactionId);
    if (transaction) {
      const updatedTransaction = { ...transaction, category };
      dispatch(appActions.updateTransaction(updatedTransaction));
    }
    setSelectedTransaction(null);
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      const newCategory: Category = {
        id: Math.random().toString(36).substr(2, 9),
        name: newCategoryName.trim(),
        color: getCategoryColor(newCategoryName.trim()),
      };
      dispatch(appActions.addCategory(newCategory));
      setNewCategoryName('');
    }
  };

  const handleDeleteCategory = (categoryId: string) => {
    // Remove category from all transactions
    const updatedTransactions = state.transactions.map(t => 
      t.category === categoryId ? { ...t, category: undefined } : t
    );
    dispatch(appActions.setTransactions(updatedTransactions));
    
    // Remove category from categories list
    dispatch(appActions.deleteCategory(categoryId));
  };

  const getCategoryStats = (categoryName: string) => {
    const transactions = state.transactions.filter(t => t.category === categoryName);
    const total = transactions.reduce((sum, t) => sum + Math.abs(t.money), 0);
    const count = transactions.length;
    return { total, count };
  };

  return (
    <div className="space-y-6">
      {/* Categories Management */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Categories</h3>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="New category name"
              className="input-field max-w-xs"
              onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
            />
            <button
              onClick={handleAddCategory}
              className="btn-primary flex items-center space-x-1"
            >
              <Plus className="h-4 w-4" />
              <span>Add</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.categories.map(category => {
            const stats = getCategoryStats(category.name);
            return (
              <div key={category.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    ></div>
                    <span className="font-medium">{category.name}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="text-sm text-gray-600">
                  <p>{stats.count} transactions</p>
                  <p>{formatMoney(stats.total)} total</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Uncategorized Transactions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Uncategorized Transactions ({uncategorizedTransactions.length})
        </h3>
        
        {uncategorizedTransactions.length === 0 ? (
          <p className="text-gray-500 text-center py-4">All transactions are categorized!</p>
        ) : (
          <div className="space-y-3">
            {uncategorizedTransactions.map(transaction => (
              <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">{formatDate(transaction.date)}</span>
                    <span className={`font-medium ${transaction.isIncome ? 'text-green-600' : 'text-red-600'}`}>
                      {formatMoney(transaction.money)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{transaction.description}</p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <select
                    value={selectedTransaction === transaction.id ? 'select' : ''}
                    onChange={(e) => {
                      if (e.target.value !== 'select') {
                        handleCategorizeTransaction(transaction.id, e.target.value);
                      }
                      setSelectedTransaction(transaction.id);
                    }}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="select">Select category</option>
                    {state.categories.map(category => (
                      <option key={category.id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Categorized Transactions Summary */}
      {categorizedTransactions.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Categorized Transactions ({categorizedTransactions.length})
          </h3>
          
          <div className="space-y-3">
            {categorizedTransactions.slice(0, 10).map(transaction => (
              <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">{formatDate(transaction.date)}</span>
                    <span className={`font-medium ${transaction.isIncome ? 'text-green-600' : 'text-red-600'}`}>
                      {formatMoney(transaction.money)}
                    </span>
                    <div className="flex items-center space-x-1">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getCategoryColor(transaction.category || '') }}
                      ></div>
                      <span className="text-sm text-gray-600">{transaction.category}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{transaction.description}</p>
                </div>
                
                <button
                  onClick={() => {
                    const updatedTransaction = { ...transaction, category: undefined };
                    dispatch(appActions.updateTransaction(updatedTransaction));
                  }}
                  className="text-gray-600 hover:text-gray-800"
                >
                  <Tag className="h-4 w-4" />
                </button>
              </div>
            ))}
            
            {categorizedTransactions.length > 10 && (
              <p className="text-sm text-gray-500 text-center py-2">
                Showing first 10 transactions. Total: {categorizedTransactions.length}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualCategorization; 