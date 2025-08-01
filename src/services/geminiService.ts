import { GoogleGenAI } from '@google/genai';
import { DEFAULT_CATEGORIES } from '../config/categories';

class GeminiService {
  private genAI: GoogleGenAI | null = null;
  private batchSize = 20; // Configurable batch size

  constructor() {
    this.initializeModel();
  }

  private getApiKey(): string {
    return localStorage.getItem('gemini_api_key') || '';
  }

  private initializeModel() {
    const apiKey = this.getApiKey();
    if (apiKey) {
      this.genAI = new GoogleGenAI({ apiKey });
    }
  }

  // Configure batch size for processing
  setBatchSize(size: number) {
    this.batchSize = Math.max(1, Math.min(50, size)); // Limit between 1-50
  }

  // Reinitialize the client when API key changes
  refreshApiKey() {
    this.initializeModel();
  }

  // Generate category list and rules from config
  private getCategoryInformation(): { categories: string; rules: string } {
    const categories = DEFAULT_CATEGORIES.map(cat => cat.name).join(', ');
    
    const rules = DEFAULT_CATEGORIES.map(cat => {
      const description = cat.description || 'General category';
      return `- Use "${cat.name}" for ${description.toLowerCase()}`;
    }).join('\n');

    return { categories, rules };
  }

  // Generate categorization prompt for single or batch transactions
  private generateCategorizationPrompt(
    transactionDetails: string,
    isBatch: boolean = false,
    customRules: Array<{ pattern: string; category: string; description: string }> = []
  ): string {
    const { categories, rules } = this.getCategoryInformation();
    
    const responseFormat = isBatch ? 
      `[
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
]` :
      `{
  "category": "category_name",
  "confidence": 0.95,
  "reason": "brief explanation"
}`;

    const responseType = isBatch ? 'JSON array' : 'JSON object';
    const verb = isBatch ? 'transactions' : 'transaction';

    // Build custom rules section
    let customRulesSection = '';
    if (customRules.length > 0) {
      const customRulesList = customRules
        .map(rule => `- If description contains "${rule.pattern}", prefer "${rule.category}" (${rule.description})`)
        .join('\n');
      
      customRulesSection = `

User's Custom Preferences:
${customRulesList}
(These are the user's specific patterns - apply similar logic to similar transactions even if they don't exactly match)

`;
    }

    return `You are a financial transaction categorization assistant with access to real-time information. Analyze the ${verb} below and categorize them accurately.

${transactionDetails.includes('paypal') || transactionDetails.includes('PayPal') ? 
  'For PayPal transactions, use search to identify the actual merchant or service behind the payment to categorize more accurately.' : 
  'Use search when needed to identify unfamiliar merchants, services, or businesses to ensure accurate categorization.'}

Transaction details:
${transactionDetails}

Available categories: ${categories}

Categorization rules:
${rules}${customRulesSection}

Use your search capability to:
- Look up unfamiliar business names or merchants
- Identify what services or products a company provides
- Determine the most appropriate category based on actual business activities
- Handle ambiguous transaction descriptions by researching the merchant

Respond with ONLY a ${responseType} in this exact format (no markdown, no code blocks, just the JSON):

${responseFormat}

Confidence should be between 0.5 and 1.0. Be accurate and use search when uncertain about a merchant or service.`;
  }

  private async makeRequest(prompt: string): Promise<string> {
    if (!this.genAI) {
      this.initializeModel();
      if (!this.genAI) {
        throw new Error('Gemini API key not found. Please configure your API key in the AI settings.');
      }
    }

    try {
      const response = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      
      const text = response.text;
      
      if (!text) {
        throw new Error('No response from Gemini API');
      }
      
      return text;
    } catch (error) {
      console.error('Gemini API error:', error);
      // If the error is related to API key, reinitialize
      if (error instanceof Error && error.message.includes('API_KEY')) {
        this.genAI = null;
      }
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
  }, customRules: Array<{ pattern: string; category: string; description: string }> = []): Promise<{
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
      transactionDetails += `
- PayPal Name: "${paypalData.name}"
- PayPal Type: "${paypalData.type}"`;
      if (paypalData.itemTitle) {
        transactionDetails += `
- PayPal Item: "${paypalData.itemTitle}"`;
      }
    }
    
    const prompt = this.generateCategorizationPrompt(transactionDetails, false, customRules);

    try {
      const response = await this.makeRequest(prompt);
      
      // Handle Gemini response with markdown code blocks
      let jsonText = response;
      
      // Remove markdown code blocks if present
      if (response.includes('```json')) {
        const jsonMatch = response.match(/```json\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          jsonText = jsonMatch[1];
    
        }
      } else {
        // Try to find JSON without markdown
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonText = jsonMatch[0];
    
        }
      }
      
      if (jsonText) {
        const result = JSON.parse(jsonText);
  
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
    onProgress?: (processed: number, total: number) => void,
    customRules: Array<{ pattern: string; category: string; description: string }> = []
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
        const batchResults = await this.categorizeBatchInternal(batch, customRules);
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
            const result = await this.categorizeTransaction(transaction.description, transaction.money, transaction.paypalData, customRules);
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
    }>,
    customRules: Array<{ pattern: string; category: string; description: string }> = []
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

        transactionInfo += ` | PayPal: ${t.paypalData.name} (${t.paypalData.type})`;
        if (t.paypalData.itemTitle) {
          transactionInfo += ` | Item: ${t.paypalData.itemTitle}`;
        }
      } else {

      }
      
      return transactionInfo;
    }).join('\n');

    const prompt = this.generateCategorizationPrompt(transactionList, true, customRules);

    try {
      const response = await this.makeRequest(prompt);
      
      // Handle Gemini response with markdown code blocks
      let jsonText = response;
      
      // Remove markdown code blocks if present
      if (response.includes('```json')) {
        const jsonMatch = response.match(/```json\s*(\[[\s\S]*?\])\s*```/);
        if (jsonMatch) {
          jsonText = jsonMatch[1];
    
        }
      } else {
        // Try to find JSON array without markdown
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          jsonText = jsonMatch[0];
    
        }
      }
      
      if (jsonText) {
        const batchResults = JSON.parse(jsonText);
  
        
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
  
      
      // Test the parsing logic
      let jsonText = responseText;
      
      if (responseText.includes('```json')) {
        const jsonMatch = responseText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          jsonText = jsonMatch[1];
    
        }
      }
      
      JSON.parse(jsonText);

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