import React, { createContext, useContext, useReducer, ReactNode, useEffect, useState } from 'react';
import { AppState, Transaction, Category } from '../types';
import { storage } from '../utils/storage';
import { getDefaultCategories } from '../config/categories';

interface AppAction {
  type: string;
  payload?: any;
}



const initialState: AppState = {
  transactions: [],
  currentBalance: null,
  yearlySalary: null,
  categories: [],
  isLoading: false,
  error: null,
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | undefined>(undefined);

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    
    case 'SET_TRANSACTIONS':
      return {
        ...state,
        transactions: action.payload,
        isLoading: false,
        error: null,
      };
    
    case 'ADD_TRANSACTION':
      return {
        ...state,
        transactions: [...state.transactions, action.payload],
      };
    
    case 'UPDATE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.map(t => 
          t.id === action.payload.id ? action.payload : t
        ),
      };
    
    case 'DELETE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.filter(t => t.id !== action.payload),
      };
    
    case 'SET_CURRENT_BALANCE':
      return {
        ...state,
        currentBalance: action.payload,
      };
    
    case 'SET_YEARLY_SALARY':
      return {
        ...state,
        yearlySalary: action.payload,
      };
    
    case 'SET_CATEGORIES':
      return {
        ...state,
        categories: action.payload,
      };
    

    
    case 'RESET_STATE':
      return initialState;
    
    default:
      return state;
  }
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load data from localStorage on app start
  useEffect(() => {
    const savedData = storage.loadData();
    if (savedData) {
      dispatch({ type: 'SET_TRANSACTIONS', payload: savedData.transactions });
      if (savedData.currentBalance !== null) {
        dispatch({ type: 'SET_CURRENT_BALANCE', payload: savedData.currentBalance });
      }
      if (savedData.yearlySalary !== null) {
        dispatch({ type: 'SET_YEARLY_SALARY', payload: savedData.yearlySalary });
      }
    }
    
    // Always load categories from config - single source of truth
    dispatch({ type: 'SET_CATEGORIES', payload: getDefaultCategories() });
    
    setIsInitialized(true);
  }, []);

  // Save data to localStorage whenever transactions, balance, or salary change
  useEffect(() => {
    // Only save after initialization to avoid overwriting with empty data
    if (isInitialized && (state.transactions.length > 0 || state.currentBalance !== null || state.yearlySalary !== null)) {
      storage.saveData(state.transactions, state.currentBalance, state.yearlySalary);
    }
  }, [state.transactions, state.currentBalance, state.yearlySalary, isInitialized]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

// Action creators for easier dispatch calls
export const appActions = {
  setLoading: (loading: boolean) => ({ type: 'SET_LOADING', payload: loading }),
  setError: (error: string) => ({ type: 'SET_ERROR', payload: error }),
  clearError: () => ({ type: 'CLEAR_ERROR' }),
  setTransactions: (transactions: Transaction[]) => ({ 
    type: 'SET_TRANSACTIONS', 
    payload: transactions 
  }),
  addTransaction: (transaction: Transaction) => ({ 
    type: 'ADD_TRANSACTION', 
    payload: transaction 
  }),
  updateTransaction: (transaction: Transaction) => ({ 
    type: 'UPDATE_TRANSACTION', 
    payload: transaction 
  }),
  deleteTransaction: (id: string) => ({ 
    type: 'DELETE_TRANSACTION', 
    payload: id 
  }),
  setCurrentBalance: (balance: number) => ({ 
    type: 'SET_CURRENT_BALANCE', 
    payload: balance 
  }),
  setYearlySalary: (salary: number) => ({ 
    type: 'SET_YEARLY_SALARY', 
    payload: salary 
  }),
  setCategories: (categories: Category[]) => ({ 
    type: 'SET_CATEGORIES', 
    payload: categories 
  }),
  resetState: () => ({ type: 'RESET_STATE' }),
}; 