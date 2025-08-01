import React, { useState } from 'react';
import { Calendar, DollarSign, Search, Filter, Edit2, Check, X } from 'lucide-react';
import { useAppContext, appActions } from '../../context/AppContext';
import { formatMoney, formatDate } from '../../utils/csvParser';
import { getCategoryColor } from '../../utils/calculations';
import { DEFAULT_CATEGORIES } from '../../config/categories';
import { 
  getIncomeTransactions, 
  getExpenseTransactions, 
  getInvestmentTransactions,
  calculateIncomeTotal,
  calculateExpenseTotal
} from '../../utils/calculations';

const TransactionList: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'categorized' | 'uncategorized' | 'paypal'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'description'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string>('');
  const [itemsPerPage, setItemsPerPage] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showPayPalData, setShowPayPalData] = useState<boolean>(false);

  if (!state.transactions.length) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <p className="text-gray-500">No transaction data to display</p>
        </div>
      </div>
    );
  }

  // Filter and sort transactions
  let filteredTransactions = state.transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesFilter = true;
    switch (filterType) {
      case 'income':
        matchesFilter = transaction.isIncome;
        break;
      case 'expense':
        matchesFilter = !transaction.isIncome;
        break;
      case 'categorized':
        matchesFilter = !!transaction.category;
        break;
      case 'uncategorized':
        matchesFilter = !transaction.category;
        break;
      case 'paypal':
        matchesFilter = !!transaction.paypalData;
        break;
      default:
        matchesFilter = true;
    }
    
    const matchesCategory = categoryFilter === 'all' || 
      (categoryFilter === 'uncategorized' && !transaction.category) ||
      (categoryFilter !== 'uncategorized' && transaction.category === categoryFilter);
    
    return matchesSearch && matchesFilter && matchesCategory;
  });

  // Sort transactions
  filteredTransactions.sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'date':
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        break;
      case 'amount':
        comparison = Math.abs(a.money) - Math.abs(b.money);
        break;
      case 'description':
        comparison = a.description.localeCompare(b.description);
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const incomeTransactions = getIncomeTransactions(filteredTransactions);
  const expenseTransactions = getExpenseTransactions(filteredTransactions);
  const investmentTransactions = getInvestmentTransactions(filteredTransactions);
  
  const totalIncome = calculateIncomeTotal(incomeTransactions);
  const totalExpenses = calculateExpenseTotal(expenseTransactions);
  const totalInvestments = calculateExpenseTotal(investmentTransactions);

  const netChange = totalIncome - totalExpenses - totalInvestments;

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  // Category editing functions
  const handleEditCategory = (transactionId: string, currentCategory: string) => {
    setEditingTransaction(transactionId);
    setEditingCategory(currentCategory);
  };

  const handleSaveCategory = (transactionId: string) => {
    const transaction = state.transactions.find(t => t.id === transactionId);
    if (transaction) {
      const updatedTransaction = { ...transaction, category: editingCategory };
      dispatch(appActions.updateTransaction(updatedTransaction));
    }
    setEditingTransaction(null);
    setEditingCategory('');
  };

  const handleCancelEdit = () => {
    setEditingTransaction(null);
    setEditingCategory('');
  };

  // Get categories from config
  const availableCategories = DEFAULT_CATEGORIES.map(cat => cat.name).sort();

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center space-x-2">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field max-w-xs"
            />
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'all' | 'income' | 'expense' | 'categorized' | 'uncategorized' | 'paypal')}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Transactions</option>
                <option value="income">Income Only</option>
                <option value="expense">Expenses Only</option>
                <option value="categorized">Categorized Only</option>
                <option value="uncategorized">Uncategorized Only</option>
                <option value="paypal">PayPal Transactions</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Categories</option>
                <option value="uncategorized">Uncategorized</option>
                {availableCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'amount' | 'description')}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="date">Date</option>
                <option value="amount">Amount</option>
                <option value="description">Description</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">PayPal:</span>
              <button
                onClick={() => setShowPayPalData(!showPayPalData)}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  showPayPalData 
                    ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                {showPayPalData ? 'Hide Data' : 'Show Data'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Income</p>
              <p className="text-lg font-bold text-green-600">{formatMoney(totalIncome)}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Expenses</p>
              <p className="text-lg font-bold text-red-600">{formatMoney(totalExpenses)}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Net Change</p>
              <p className={`text-lg font-bold ${netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatMoney(netChange)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Transactions</p>
              <p className="text-lg font-bold text-gray-900">{filteredTransactions.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Transaction Details ({filteredTransactions.length} transactions)
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Description</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Category</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">Amount</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Type</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.map((transaction) => (
                <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {formatDate(transaction.date)}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900 max-w-xs truncate">
                    <div>
                      <div>{transaction.description}</div>
                      {transaction.paypalData && showPayPalData && (
                        <div className="text-xs text-blue-600 mt-1 space-y-1">
                          <div><strong>PayPal:</strong> {transaction.paypalData.name}</div>
                          <div><strong>Type:</strong> {transaction.paypalData.type}</div>
                          {transaction.paypalData.itemTitle && (
                            <div><strong>Item:</strong> {transaction.paypalData.itemTitle}</div>
                          )}
                          {transaction.paypalData.transactionId && (
                            <div><strong>ID:</strong> {transaction.paypalData.transactionId}</div>
                          )}
                          {transaction.paypalData.confidence && (
                            <div><strong>Confidence:</strong> {Math.round(transaction.paypalData.confidence * 100)}%</div>
                          )}
                        </div>
                      )}
                      {transaction.paypalData && !showPayPalData && (
                        <div className="text-xs text-blue-600 mt-1">
                          PayPal: {transaction.paypalData.name} ({transaction.paypalData.type})
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {editingTransaction === transaction.id ? (
                      <div className="flex items-center space-x-2">
                        <select
                          value={editingCategory}
                          onChange={(e) => setEditingCategory(e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="">Uncategorized</option>
                          {state.categories.map(category => (
                            <option key={category.id} value={category.name}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleSaveCategory(transaction.id)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        {transaction.category ? (
                          <>
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: getCategoryColor(transaction.category) }}
                            ></div>
                            <span className="text-gray-700">{transaction.category}</span>
                          </>
                        ) : (
                          <span className="text-gray-400">Uncategorized</span>
                        )}
                        <button
                          onClick={() => handleEditCategory(transaction.id, transaction.category || '')}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className={`py-3 px-4 text-sm font-medium text-right ${
                    transaction.isIncome ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatMoney(transaction.money)}
                  </td>
                  <td className="py-3 px-4 text-sm text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      transaction.isIncome 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {transaction.isIncome ? 'Income' : 'Expense'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-center">
                    {/* Actions column - can be expanded later */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredTransactions.length)} of {filteredTransactions.length} transactions
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
        
        {filteredTransactions.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No transactions match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionList; 