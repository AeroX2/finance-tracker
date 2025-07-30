export interface CategoryConfig {
  id: string;
  name: string;
  color: string;
  description?: string;
}

// Default categories with predefined colors
export const DEFAULT_CATEGORIES: CategoryConfig[] = [
  { id: 'income', name: 'Income', color: '#10B981', description: 'Salary, wages, and other income sources' },
  { id: 'groceries', name: 'Groceries', color: '#3B82F6', description: 'Food and household essentials' },
  { id: 'dining', name: 'Dining', color: '#F59E0B', description: 'Restaurants, takeout, and dining out' },
  { id: 'transportation', name: 'Transportation', color: '#8B5CF6', description: 'Gas, public transport, car maintenance' },
  { id: 'shopping', name: 'Shopping', color: '#EC4899', description: 'Clothing, electronics, and general purchases' },
  { id: 'entertainment', name: 'Entertainment', color: '#06B6D4', description: 'Movies, games, and recreational activities' },
  { id: 'utilities', name: 'Utilities', color: '#84CC16', description: 'Electricity, water, gas, internet' },
  { id: 'healthcare', name: 'Healthcare', color: '#EF4444', description: 'Medical expenses, prescriptions, insurance' },
  { id: 'insurance', name: 'Insurance', color: '#F97316', description: 'Health, car, home, and other insurance' },
  { id: 'education', name: 'Education', color: '#6366F1', description: 'Tuition, books, courses, and learning' },
  { id: 'travel', name: 'Travel', color: '#14B8A6', description: 'Flights, hotels, and vacation expenses' },
  { id: 'home', name: 'Home', color: '#A855F7', description: 'Rent, mortgage, furniture, and home improvement' },
  { id: 'personal-care', name: 'Personal Care', color: '#F43F5E', description: 'Haircuts, cosmetics, and personal services' },
  { id: 'gifts', name: 'Gifts', color: '#EAB308', description: 'Presents and gift-giving expenses' },
  { id: 'subscriptions', name: 'Subscriptions', color: '#22C55E', description: 'Monthly services and recurring payments' },
  { id: 'investment', name: 'Investment', color: '#059669', description: 'Stocks, bonds, retirement contributions' },
  { id: 'donations', name: 'Donations', color: '#DC2626', description: 'Charitable giving and donations' },
  { id: 'rent-offset', name: 'Rent Offset', color: '#16A34A', description: 'Roommate payments that offset housing costs' },
  { id: 'other', name: 'Other', color: '#6B7280', description: 'Miscellaneous expenses' },
];

// Fallback colors for dynamically created categories
const FALLBACK_COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // green
  '#F59E0B', // yellow
  '#8B5CF6', // purple
  '#F97316', // orange
  '#06B6D4', // cyan
  '#84CC16', // lime
  '#EC4899', // pink
  '#6B7280', // gray
  '#14B8A6', // teal
  '#F43F5E', // rose
  '#6366F1', // indigo
  '#A855F7', // violet
  '#EAB308', // amber
  '#22C55E', // emerald
];

/**
 * Get the color for a category by name
 * First checks predefined categories, then falls back to hash-based color generation
 */
export const getCategoryColor = (categoryName: string): string => {
  // Check if it's a predefined category
  const predefinedCategory = DEFAULT_CATEGORIES.find(
    cat => cat.name.toLowerCase() === categoryName.toLowerCase() || 
           cat.id.toLowerCase() === categoryName.toLowerCase()
  );
  
  if (predefinedCategory) {
    return predefinedCategory.color;
  }
  
  // Fallback to hash-based color for custom categories
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    const char = categoryName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
};

/**
 * Get category configuration by name or ID
 */
export const getCategoryConfig = (categoryIdentifier: string): CategoryConfig | null => {
  return DEFAULT_CATEGORIES.find(
    cat => cat.name.toLowerCase() === categoryIdentifier.toLowerCase() || 
           cat.id.toLowerCase() === categoryIdentifier.toLowerCase()
  ) || null;
};

/**
 * Get all default categories
 */
export const getDefaultCategories = (): CategoryConfig[] => {
  return [...DEFAULT_CATEGORIES];
};

/**
 * Check if a category is a special category (like Investment or Rent Offset)
 */
export const isSpecialCategory = (categoryName: string): { 
  isInvestment: boolean; 
  isRentOffset: boolean; 
  isIncome: boolean; 
} => {
  const lowerName = categoryName.toLowerCase();
  return {
    isInvestment: lowerName === 'investment',
    isRentOffset: lowerName === 'rent offset',
    isIncome: lowerName === 'income',
  };
};