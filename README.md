# Finance Tracker

A comprehensive web-based tool for analyzing personal finances through CSV data import and intelligent categorization.

## Features

### Core Functionality
- **CSV Import**: Upload bank transaction data in CSV format (date, money, description)
- **Current Balance Tracking**: Input current bank account value for accurate analysis
- **Interactive Visualizations**: Dynamic charts showing spending patterns and trends
- **Multi-timeframe Analysis**: Daily, weekly, monthly, and yearly spending averages
- **Trend Analysis**: Trendline graphs showing spending patterns over time
- **Salary Integration**: Calculate average bank account increase per week based on yearly salary
- **Manual Categorization**: Categorize transactions manually for detailed analysis
- **AI-Powered Auto-Categorization**: Automatic transaction categorization using LLM services

### Data Visualization
- **Spending Timeline**: Visual representation of money flow over time
- **Category Breakdown**: Pie charts and bar graphs showing spending by category
- **Trend Analysis**: Linear regression and trend analysis for spending patterns
- **Comparative Analysis**: Side-by-side comparisons of different time periods

### Smart Features
- **Intelligent Categorization**: Machine learning-based transaction categorization
- **Pattern Recognition**: Identify recurring expenses and unusual spending
- **Budget Insights**: Compare actual spending against income trends
- **Export Capabilities**: Generate reports and export analyzed data
- **Custom Categorization Rules**: Define your own patterns for automatic categorization
- **Data Backup & Restore**: Backup and restore your financial data with JSON exports
- **Enhanced Upload Modes**: Combine new data with existing categorized transactions

## CSV Format

The tool expects CSV files with the following format (no headers needed):
```csv
"27/07/2025","-23.00","Coles"
"28/07/2025","2500.00","Salary deposit"
"29/07/2025","-45.50","Restaurant dinner"
```

### CSV Requirements
- **Date**: DD/MM/YYYY format (e.g., "27/07/2025")
- **Money**: Positive for income, negative for expenses (quoted values supported)
- **Description**: Transaction description for categorization

## Technology Stack

- **Frontend**: React with TypeScript
- **Charts**: Chart.js or D3.js for data visualization
- **Styling**: Tailwind CSS for modern UI
- **File Processing**: Papa Parse for CSV handling
- **AI Integration**: OpenAI API or similar for auto-categorization
- **State Management**: React Context or Redux
- **Build Tool**: Vite for fast development

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables for AI services
4. Start development server: `npm run dev`

### Environment Variables
Create a `.env` file:
```
# Google Gemini API Key (for AI auto-categorization)
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# App Configuration
VITE_APP_NAME=Finance Tracker
```

**To get your Gemini API key:**
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it to your `.env` file

## Usage

1. **Upload CSV**: Drag and drop your bank CSV file
2. **Set Current Balance**: Input your current bank account value
3. **Configure Salary**: Enter your yearly salary for income analysis
4. **Review Auto-Categorization**: Check and adjust AI-categorized transactions
5. **Analyze**: Explore charts and insights
6. **Export**: Download reports and analyzed data

## Advanced Features

### Data Management
- **Backup Data**: Create JSON backups of your categorized transactions and categories
- **Restore Data**: Import previous backups to restore your data
- **Combine Mode**: Upload new CSV data while preserving existing categorizations
- **Replace Mode**: Completely replace all data with new uploads

### Custom AI Rules
- **Pattern Matching**: Define custom patterns to automatically categorize transactions
- **Rule Testing**: Test your rules before applying them to see matching transactions
- **Priority System**: Set rule priorities to handle conflicting patterns
- **Active/Inactive Rules**: Enable or disable rules as needed

### Enhanced Upload
- **Smart Merging**: Automatically detect and skip duplicate transactions
- **Category Preservation**: Maintain existing categorizations when combining data
- **Upload Modes**: Choose between combining with existing data or replacing all data
 
