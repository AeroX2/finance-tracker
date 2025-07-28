interface GeminiRequest {
  contents: Array<{
    parts: Array<{
      text: string;
    }>;
  }>;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

class GeminiService {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
  private batchSize = 50; // Configurable batch size

  constructor() {
    this.apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
  }

  // Configure batch size for processing
  setBatchSize(size: number) {
    this.batchSize = Math.max(1, Math.min(50, size)); // Limit between 1-20
    console.log(`Batch size set to ${this.batchSize}`);
  }

  private async makeRequest(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not found. Please set VITE_GEMINI_API_KEY in your environment variables.');
    }

    const requestBody: GeminiRequest = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ]
    };

    try {
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data: GeminiResponse = await response.json();
      
      if (data.candidates && data.candidates.length > 0) {
        return data.candidates[0].content.parts[0].text;
      } else {
        throw new Error('No response from Gemini API');
      }
    } catch (error) {
      console.error('Gemini API error:', error);
      throw error;
    }
  }

  async categorizeTransaction(description: string, amount: number, paypalData?: {
    name: string;
    type: string;
    transactionId: string;
    receiptId: string;
    itemTitle: string;
    confidence: number;
    reason: string;
  }): Promise<{
    category: string;
    confidence: number;
    reason: string;
  }> {
    const isIncome = amount > 0;
    const amountStr = Math.abs(amount).toFixed(2);
    
    let transactionDetails = `- Description: "${description}"
- Amount: ${isIncome ? '+' : '-'}$${amountStr}
- Type: ${isIncome ? 'Income' : 'Expense'}`;

    // Add PayPal data if available
    if (paypalData) {
      console.log('Individual categorization - PayPal data:', paypalData);
      transactionDetails += `
- PayPal Name: "${paypalData.name}"
- PayPal Type: "${paypalData.type}"`;
      if (paypalData.itemTitle) {
        transactionDetails += `
- PayPal Item: "${paypalData.itemTitle}"`;
      }
    }
    
    const prompt = `Please categorize this financial transaction. Respond with ONLY a JSON object in this exact format (no markdown, no code blocks, just the JSON):

{
  "category": "category_name",
  "confidence": 0.95,
  "reason": "brief explanation"
}

Transaction details:
${transactionDetails}

Available categories: Income, Groceries, Dining, Transportation, Shopping, Entertainment, Utilities, Healthcare, Insurance, Education, Travel, Home, Personal Care, Gifts, Subscriptions, Other

Rules:
- Use "Income" for salary, deposits, refunds, etc.
- Use "Groceries" for supermarkets, food stores, etc.
- Use "Dining" for restaurants, cafes, fast food, etc.
- Use "Transportation" for fuel, parking, rideshare, public transport, etc.
- Use "Shopping" for retail stores, online shopping, etc.
- Use "Entertainment" for movies, streaming, games, etc.
- Use "Utilities" for electricity, water, internet, phone bills, etc.
- Use "Healthcare" for medical, pharmacy, dental, etc.
- Use "Insurance" for any insurance payments
- Use "Education" for courses, books, training, etc.
- Use "Travel" for flights, hotels, vacation expenses, etc.
- Use "Home" for furniture, repairs, maintenance, etc.
- Use "Personal Care" for beauty, gym, wellness, etc.
- Use "Gifts" for presents, donations, etc.
- Use "Subscriptions" for recurring services
- Use "Other" if unsure

Be confident but accurate. Confidence should be between 0.5 and 1.0. Respond with ONLY the JSON object, no additional text or formatting.`;

    try {
      const response = await this.makeRequest(prompt);
      
      // Handle Gemini response with markdown code blocks
      let jsonText = response;
      
      // Remove markdown code blocks if present
      if (response.includes('```json')) {
        const jsonMatch = response.match(/```json\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          jsonText = jsonMatch[1];
          console.log('Extracted JSON from markdown code block:', jsonText);
        }
      } else {
        // Try to find JSON without markdown
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonText = jsonMatch[0];
          console.log('Extracted JSON without markdown:', jsonText);
        }
      }
      
      if (jsonText) {
        const result = JSON.parse(jsonText);
        console.log('Successfully parsed Gemini response:', result);
        return {
          category: result.category || 'Other',
          confidence: Math.max(0.5, Math.min(1.0, result.confidence || 0.7)),
          reason: result.reason || 'AI categorization'
        };
      } else {
        // Fallback if JSON parsing fails
        console.warn('Unable to parse JSON from Gemini response:', response);
        return {
          category: 'Other',
          confidence: 0.5,
          reason: 'Unable to parse AI response'
        };
      }
    } catch (error) {
      console.error('Categorization error:', error);
      return {
        category: 'Other',
        confidence: 0.3,
        reason: 'AI service unavailable'
      };
    }
  }

  async categorizeBatch(
    transactions: Array<{
      id: string;
      description: string;
      money: number;
      paypalData?: {
        name: string;
        type: string;
        transactionId: string;
        receiptId: string;
        itemTitle: string;
        confidence: number;
        reason: string;
      };
    }>,
    onProgress?: (processed: number, total: number) => void
  ): Promise<Array<{
    transactionId: string;
    suggestedCategory: string;
    confidence: number;
    reason: string;
  }>> {
    const results = [];
    const total = transactions.length;
    const BATCH_SIZE = this.batchSize; // Use configurable batch size
    
    // Process transactions in batches
    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE);
      
      try {
        const batchResults = await this.categorizeBatchInternal(batch);
        results.push(...batchResults);
        
        // Update progress for the entire batch
        const processed = Math.min(i + BATCH_SIZE, total);
        if (onProgress) {
          onProgress(processed, total);
        }
        
        // Small delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < transactions.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.error(`Error processing batch starting at index ${i}:`, error);
        
        // Fallback to individual processing for this batch
        for (const transaction of batch) {
          try {
            const result = await this.categorizeTransaction(transaction.description, transaction.money, transaction.paypalData);
            results.push({
              transactionId: transaction.id,
              suggestedCategory: result.category,
              confidence: result.confidence,
              reason: result.reason
            });
          } catch (individualError) {
            console.error(`Error categorizing transaction ${transaction.id}:`, individualError);
            results.push({
              transactionId: transaction.id,
              suggestedCategory: 'Other',
              confidence: 0.3,
              reason: 'AI categorization failed'
            });
          }
        }
        
        // Update progress for fallback processing
        const processed = Math.min(i + BATCH_SIZE, total);
        if (onProgress) {
          onProgress(processed, total);
        }
      }
    }
    
    return results;
  }

  private async categorizeBatchInternal(
    transactions: Array<{
      id: string;
      description: string;
      money: number;
      paypalData?: {
        name: string;
        type: string;
        transactionId: string;
        receiptId: string;
        itemTitle: string;
        confidence: number;
        reason: string;
      };
    }>
  ): Promise<Array<{
    transactionId: string;
    suggestedCategory: string;
    confidence: number;
    reason: string;
  }>> {
    if (transactions.length === 0) return [];
    
        // Create a batch prompt for multiple transactions
    const transactionList = transactions.map((t, index) => {
      const isIncome = t.money > 0;
      const amountStr = Math.abs(t.money).toFixed(2);
      let transactionInfo = `${index + 1}. Description: "${t.description}" | Amount: ${isIncome ? '+' : '-'}$${amountStr} | Type: ${isIncome ? 'Income' : 'Expense'}`;
      
      // Add PayPal data if available
      if (t.paypalData) {
        console.log(`Batch processing - Transaction ${index + 1} has PayPal data:`, t.paypalData);
        transactionInfo += ` | PayPal: ${t.paypalData.name} (${t.paypalData.type})`;
        if (t.paypalData.itemTitle) {
          transactionInfo += ` | Item: ${t.paypalData.itemTitle}`;
        }
      } else {
        console.log(`Batch processing - Transaction ${index + 1} has NO PayPal data`);
      }
      
      return transactionInfo;
    }).join('\n');

    const prompt = `Please categorize these financial transactions. Respond with ONLY a JSON array in this exact format (no markdown, no code blocks, just the JSON):

[
  {
    "index": 1,
    "category": "category_name",
    "confidence": 0.95,
    "reason": "brief explanation"
  },
  {
    "index": 2,
    "category": "category_name", 
    "confidence": 0.88,
    "reason": "brief explanation"
  }
]

Transaction details:
${transactionList}

Available categories: Income, Groceries, Dining, Transportation, Shopping, Entertainment, Utilities, Healthcare, Insurance, Education, Travel, Home, Personal Care, Gifts, Subscriptions, Investment, Donations, Other

Rules:
- Use "Income" for salary, deposits, refunds, etc.
- Use "Groceries" for supermarkets, food stores, etc.
- Use "Dining" for restaurants, cafes, fast food, etc.
- Use "Transportation" for fuel, parking, rideshare, public transport, etc.
- Use "Shopping" for retail stores, online shopping, etc.
- Use "Entertainment" for movies, streaming, games, etc.
- Use "Utilities" for electricity, water, internet, phone bills, etc.
- Use "Healthcare" for medical, pharmacy, dental, etc.
- Use "Insurance" for any insurance payments
- Use "Education" for courses, books, training, etc.
- Use "Travel" for flights, hotels, vacation expenses, etc.
- Use "Home" for furniture, repairs, maintenance, etc.
- Use "Personal Care" for beauty, gym, wellness, etc.
- Use "Gifts" for presents, donations, etc.
- Use "Subscriptions" for recurring services
- Use "Investment" for stocks, bonds, crypto, trading, etc.
- Use "Donations" for charitable giving, donations, etc.
- Use "Other" if unsure

Be confident but accurate. Confidence should be between 0.5 and 1.0. Respond with ONLY the JSON array, no additional text or formatting.`;

    try {
      const response = await this.makeRequest(prompt);
      
      // Handle Gemini response with markdown code blocks
      let jsonText = response;
      
      // Remove markdown code blocks if present
      if (response.includes('```json')) {
        const jsonMatch = response.match(/```json\s*(\[[\s\S]*?\])\s*```/);
        if (jsonMatch) {
          jsonText = jsonMatch[1];
          console.log('Extracted JSON array from markdown code block:', jsonText);
        }
      } else {
        // Try to find JSON array without markdown
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          jsonText = jsonMatch[0];
          console.log('Extracted JSON array without markdown:', jsonText);
        }
      }
      
      if (jsonText) {
        const batchResults = JSON.parse(jsonText);
        console.log('Successfully parsed batch Gemini response:', batchResults);
        
        // Map results back to transactions
        return batchResults.map((result: any, index: number) => ({
          transactionId: transactions[index].id,
          suggestedCategory: result.category || 'Other',
          confidence: Math.max(0.5, Math.min(1.0, result.confidence || 0.7)),
          reason: result.reason || 'AI categorization'
        }));
      } else {
        // Fallback if JSON parsing fails
        console.warn('Unable to parse JSON array from Gemini response:', response);
        return transactions.map(transaction => ({
          transactionId: transaction.id,
          suggestedCategory: 'Other',
          confidence: 0.5,
          reason: 'Unable to parse AI response'
        }));
      }
    } catch (error) {
      console.error('Batch categorization error:', error);
      return transactions.map(transaction => ({
        transactionId: transaction.id,
        suggestedCategory: 'Other',
        confidence: 0.3,
        reason: 'AI service unavailable'
      }));
    }
  }

  // Test function to verify response parsing
  async testResponseParsing(): Promise<void> {
    const testResponse = `{
  "candidates": [
    {
      "content": {
        "parts": [
          {
            "text": "\`\`\`json\n{\n  \"category\": \"Groceries\",\n  \"confidence\": 0.98,\n  \"reason\": \"The description contains 'COLES', which is a supermarket chain.\"\n}\n\`\`\`"
          }
        ],
        "role": "model"
      },
      "finishReason": "STOP",
      "avgLogprobs": -0.18163995539888422
    }
  ],
  "usageMetadata": {
    "promptTokenCount": 396,
    "candidatesTokenCount": 47,
    "totalTokenCount": 443
  }
}`;

    try {
      const data = JSON.parse(testResponse);
      const responseText = data.candidates[0].content.parts[0].text;
      console.log('Test response text:', responseText);
      
      // Test the parsing logic
      let jsonText = responseText;
      
      if (responseText.includes('```json')) {
        const jsonMatch = responseText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          jsonText = jsonMatch[1];
          console.log('✅ Successfully extracted JSON from markdown:', jsonText);
        }
      }
      
      const result = JSON.parse(jsonText);
      console.log('✅ Successfully parsed test response:', result);
    } catch (error) {
      console.error('❌ Test response parsing failed:', error);
    }
  }
}

export const geminiService = new GeminiService();

// Make test function available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).testGeminiParsing = () => {
    geminiService.testResponseParsing();
  };
} 