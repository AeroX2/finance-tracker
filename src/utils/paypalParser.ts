import Papa from 'papaparse';

// Helper function to parse DD/MM/YYYY date format
const parsePayPalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  
  // Handle DD/MM/YYYY format
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  
  // Fallback to standard date parsing
  return new Date(dateStr);
};

export interface PayPalTransaction {
  date: string;
  time: string;
  timeZone: string;
  name: string;
  type: string;
  status: string;
  currency: string;
  amount: number;
  fees: number;
  total: number;
  exchangeRate: string;
  receiptId: string;
  balance: number;
  transactionId: string;
  itemTitle: string;
}

export interface TransactionMatch {
  bankTransaction: any;
  paypalTransaction: PayPalTransaction;
  confidence: number;
  reason: string;
}

export const parsePayPalCSV = async (file: File): Promise<PayPalTransaction[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error(`CSV parsing errors: ${results.errors.map(e => e.message).join(', ')}`));
          return;
        }

        const transactions: PayPalTransaction[] = results.data.map((row: any) => {
          const transaction = {
            date: row['Date'] || '',
            time: row['Time'] || '',
            timeZone: row['Time zone'] || '',
            name: row['Name'] || '',
            type: row['Type'] || '',
            status: row['Status'] || '',
            currency: row['Currency'] || '',
            amount: parseFloat(row['Amount'] || '0'),
            fees: parseFloat(row['Fees'] || '0'),
            total: parseFloat(row['Total'] || '0'),
            exchangeRate: row['Exchange Rate'] || '',
            receiptId: row['Receipt ID'] || '',
            balance: parseFloat(row['Balance'] || '0'),
            transactionId: row['Transaction ID'] || '',
            itemTitle: row['Item Title'] || '',
          };
          

          
          return transaction;
        });

        resolve(transactions);
      },
      error: (error) => {
        reject(new Error(`Failed to parse PayPal CSV: ${error.message}`));
      }
    });
  });
};

export const matchPayPalTransactions = (
  bankTransactions: any[],
  paypalTransactions: PayPalTransaction[]
): TransactionMatch[] => {
  const matches: TransactionMatch[] = [];
  
  // Filter out internal PayPal transfers and focus on external transactions
  const externalPayPalTransactions = paypalTransactions.filter(t => 
    t.type !== 'Transfer to PayPal account' && 
    t.type !== 'User Initiated Withdrawal' &&
    t.type !== 'General Currency Conversion' &&
    t.status === 'Completed'
  );

  for (const paypalTx of externalPayPalTransactions) {
    let bestMatch: any = null;
    let bestConfidence = 0;
    let bestReason = '';

    for (const bankTx of bankTransactions) {
      const confidence = calculateMatchConfidence(bankTx, paypalTx);
      
      if (confidence > bestConfidence && confidence > 0.8) { // Minimum 80% confidence for exact matches
        bestMatch = bankTx;
        bestConfidence = confidence;
        bestReason = getMatchReason(bankTx, paypalTx);
      }
    }

    if (bestMatch) {
      matches.push({
        bankTransaction: bestMatch,
        paypalTransaction: paypalTx,
        confidence: bestConfidence,
        reason: bestReason
      });
    }
  }

  return matches;
};

const calculateMatchConfidence = (bankTx: any, paypalTx: PayPalTransaction): number => {
  let confidence = 0;
  
  // Amount matching (most important) - use exact floating point comparison
  const epsilon = 0.01; // 1 cent tolerance
  const amountMatch = Math.abs(Math.abs(bankTx.money) - Math.abs(paypalTx.total)) <= epsilon;
  if (amountMatch) {
    confidence += 0.6; // 60% weight for amount match
  }

  // Date matching - exact date match only
  const bankDate = new Date(bankTx.date);
  const paypalDate = parsePayPalDate(paypalTx.date);
  const dateDiff = Math.abs(bankDate.getTime() - paypalDate.getTime());
  const daysDiff = dateDiff / (1000 * 60 * 60 * 24);
  
  if (daysDiff <= 3) {
    confidence += 0.4; // 40% weight for exact date match
  }

  // Description matching
  const bankDesc = bankTx.description.toLowerCase();
  const paypalName = paypalTx.name.toLowerCase();
  const paypalType = paypalTx.type.toLowerCase();
  
  // Check if PayPal name appears in bank description
  if (paypalName && bankDesc.includes(paypalName)) {
    confidence += 0.2; // 20% weight for name match
  }
  
  // Check for common keywords
  const commonKeywords = ['paypal', 'alipay', 'express checkout', 'payment'];
  for (const keyword of commonKeywords) {
    if (bankDesc.includes(keyword) || paypalName.includes(keyword) || paypalType.includes(keyword)) {
      confidence += 0.1; // 10% weight for keyword match
      break;
    }
  }

  return Math.min(confidence, 1.0); // Cap at 100%
};

const getMatchReason = (bankTx: any, paypalTx: PayPalTransaction): string => {
  const reasons: string[] = [];
  
  if (Math.abs(bankTx.money) === Math.abs(paypalTx.total)) {
    reasons.push('Exact amount match');
  }
  
  const bankDate = new Date(bankTx.date);
  const paypalDate = parsePayPalDate(paypalTx.date);
  const dateDiff = Math.abs(bankDate.getTime() - paypalDate.getTime());
  const daysDiff = dateDiff / (1000 * 60 * 60 * 24);
  
  if (daysDiff <= 1) {
    reasons.push('Same day transaction');
  } else if (daysDiff <= 3) {
    reasons.push('Within 3 days');
  }
  
  const bankDesc = bankTx.description.toLowerCase();
  const paypalName = paypalTx.name.toLowerCase();
  
  if (paypalName && bankDesc.includes(paypalName)) {
    reasons.push('Name match in description');
  }
  
  return reasons.join(', ');
}; 