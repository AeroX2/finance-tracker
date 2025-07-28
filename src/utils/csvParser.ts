import Papa from 'papaparse';
import { Transaction } from '../types';

export const parseCSV = (file: File): Promise<Transaction[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const transactions = results.data
            .map((row: any, index: number) => {
              // Expecting format: [date, money, description]
              if (!Array.isArray(row) || row.length < 3) {
                throw new Error(`Row ${index + 1}: Expected 3 columns (date, money, description)`);
              }

              const [dateStr, moneyStr, description] = row;
              
              // Validate required fields
              if (!dateStr || !moneyStr || !description) {
                throw new Error(`Row ${index + 1}: Missing required fields`);
              }

              // Parse date
              const date = parseDate(dateStr);
              if (!date) {
                throw new Error(`Row ${index + 1}: Invalid date format`);
              }

              // Parse money value
              const money = parseMoney(moneyStr);
              if (money === null) {
                throw new Error(`Row ${index + 1}: Invalid money format`);
              }

              return {
                id: generateId(),
                date: date,
                money: money,
                description: description.trim(),
                isIncome: money > 0,
              } as Transaction;
            })
            .filter((transaction: Transaction) => transaction.money !== 0); // Filter out zero-value transactions

          resolve(transactions);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      },
    });
  });
};

const parseDate = (dateString: string): string | null => {
  try {
    // Handle DD/MM/YYYY format (like "27/07/2025")
    if (dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          const date = new Date(year, month - 1, day);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }
        }
      }
    }
    
    // Handle YYYY-MM-DD format
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    return null;
  } catch {
    return null;
  }
};

const parseMoney = (moneyString: string): number | null => {
  try {
    // Remove quotes and currency symbols
    const cleaned = moneyString.replace(/["'$,€£¥]/g, '').trim();
    const parsed = parseFloat(cleaned);
    
    if (isNaN(parsed)) {
      return null;
    }
    
    return parsed;
  } catch {
    return null;
  }
};

const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const validateCSVFormat = (data: any[]): boolean => {
  // Check if data has at least one row with 3 columns
  if (!data || data.length === 0) return false;
  
  const firstRow = data[0];
  return Array.isArray(firstRow) && firstRow.length >= 3;
};

export const formatMoney = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}; 