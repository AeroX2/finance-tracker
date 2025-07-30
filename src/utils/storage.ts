import type { Transaction, Category } from '../types';

interface StoredData {
  transactions: Transaction[];
  categories: Category[];
  currentBalance: number | null;
  yearlySalary: number | null;
  lastUpdated: string;
  version: string;
}

const STORAGE_KEY = 'money-analyzer-data';
const CURRENT_VERSION = '1.0.0';

export const storage = {
  // Save data to localStorage
  saveData: (transactions: Transaction[], categories: Category[], currentBalance?: number | null, yearlySalary?: number | null) => {
    try {
      const data: StoredData = {
        transactions,
        categories,
        currentBalance: currentBalance || null,
        yearlySalary: yearlySalary || null,
        lastUpdated: new Date().toISOString(),
        version: CURRENT_VERSION
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save data to localStorage:', error);
    }
  },

  // Load data from localStorage
  loadData: (): { transactions: Transaction[]; categories: Category[]; currentBalance: number | null; yearlySalary: number | null } | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const data: StoredData = JSON.parse(stored);
      
      // Version check for future migrations
      if (data.version !== CURRENT_VERSION) {
        console.warn('Stored data version mismatch, clearing old data');
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }



      return {
        transactions: data.transactions,
        categories: data.categories,
        currentBalance: data.currentBalance || null,
        yearlySalary: data.yearlySalary || null
      };
    } catch (error) {
      console.error('Failed to load data from localStorage:', error);
      return null;
    }
  },

  // Clear all stored data
  clearData: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  },

  // Check if data exists and is recent (within 24 hours)
  hasRecentData: (): boolean => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return false;

      const data: StoredData = JSON.parse(stored);
      const lastUpdated = new Date(data.lastUpdated);
      const now = new Date();
      const hoursDiff = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);

      return hoursDiff < 24; // Consider data "recent" if less than 24 hours old
    } catch (error) {
      console.error('Failed to check data recency:', error);
      return false;
    }
  },

  // Get storage info for debugging
  getStorageInfo: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return { exists: false };

      const data: StoredData = JSON.parse(stored);
      return {
        exists: true,
        transactionCount: data.transactions.length,
        categoryCount: data.categories.length,
        lastUpdated: data.lastUpdated,
        version: data.version
      };
    } catch (error) {
      return { exists: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}; 