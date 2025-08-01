import React, { useState, useEffect } from 'react';
import { Brain, Plus, Trash2, Edit3, Save, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { getCategoryColor } from '../../utils/calculations';

interface CustomRule {
  id: string;
  pattern: string;
  category: string;
  description: string;
  isActive: boolean;
  priority: number;
  createdAt: string;
}

const CustomCategorizationRules: React.FC = () => {
  const { state } = useAppContext();
  const [rules, setRules] = useState<CustomRule[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<Partial<CustomRule>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRule, setNewRule] = useState<Partial<CustomRule>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Load rules from localStorage on component mount
  useEffect(() => {
    const savedRules = localStorage.getItem('custom-categorization-rules');
    if (savedRules) {
      try {
        const parsedRules = JSON.parse(savedRules);
        setRules(parsedRules);
      } catch (error) {
        console.error('Failed to load custom rules:', error);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save rules to localStorage whenever rules change (but only after initial load)
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('custom-categorization-rules', JSON.stringify(rules));
    }
  }, [rules, isLoaded]);

  const addRule = () => {
    if (!newRule.pattern || !newRule.category) {
      setMessage({ type: 'error', text: 'Please fill in both pattern and category' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    const rule: CustomRule = {
      id: Date.now().toString(),
      pattern: newRule.pattern.toLowerCase(),
      category: newRule.category,
      description: newRule.description || `Custom rule for ${newRule.pattern}`,
      isActive: true,
      priority: rules.length + 1,
      createdAt: new Date().toISOString()
    };

    setRules([...rules, rule]);
    setNewRule({});
    setShowAddForm(false);
    setMessage({ type: 'success', text: 'Custom rule added successfully!' });
    setTimeout(() => setMessage(null), 3000);
  };

  const updateRule = (id: string) => {
    if (!editingRule.pattern || !editingRule.category) {
      setMessage({ type: 'error', text: 'Please fill in both pattern and category' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setRules(rules.map(rule => 
      rule.id === id 
        ? { ...rule, ...editingRule, pattern: editingRule.pattern!.toLowerCase() }
        : rule
    ));
    setIsEditing(null);
    setEditingRule({});
    setMessage({ type: 'success', text: 'Rule updated successfully!' });
    setTimeout(() => setMessage(null), 3000);
  };

  const deleteRule = (id: string) => {
    if (window.confirm('Are you sure you want to delete this rule?')) {
      setRules(rules.filter(rule => rule.id !== id));
      setMessage({ type: 'success', text: 'Rule deleted successfully!' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const toggleRule = (id: string) => {
    setRules(rules.map(rule => 
      rule.id === id ? { ...rule, isActive: !rule.isActive } : rule
    ));
  };



  const testRule = (pattern: string) => {
    const matchingTransactions = state.transactions.filter(t => 
      t.description.toLowerCase().includes(pattern.toLowerCase())
    );
    
    if (matchingTransactions.length === 0) {
      setMessage({ type: 'info', text: 'No transactions match this pattern' });
    } else {
      setMessage({ 
        type: 'info', 
        text: `Found ${matchingTransactions.length} matching transactions` 
      });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Brain className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Custom Categorization Rules</h3>
            <p className="text-sm text-gray-600">
              Define your own patterns to automatically categorize transactions
            </p>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`p-3 rounded-lg mb-4 ${
            message.type === 'success' ? 'bg-green-50 border border-green-200' :
            message.type === 'error' ? 'bg-red-50 border border-red-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex items-center space-x-2">
              {message.type === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
              {message.type === 'error' && <AlertTriangle className="h-5 w-5 text-red-600" />}
              <span className={`text-sm ${
                message.type === 'success' ? 'text-green-800' :
                message.type === 'error' ? 'text-red-800' :
                'text-blue-800'
              }`}>
                {message.text}
              </span>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Total Rules</p>
            <p className="text-xl font-bold text-gray-900">{rules.length}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Active Rules</p>
            <p className="text-xl font-bold text-green-600">{rules.filter(r => r.isActive).length}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Uncategorized</p>
            <p className="text-xl font-bold text-orange-600">
              {state.transactions.filter(t => !t.category).length}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-4 mb-6">
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Rule</span>
          </button>
        </div>
        
        {/* Info about automatic application */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <Brain className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-900">Automatic Integration</h4>
              <p className="text-sm text-blue-700 mt-1">
                Custom rules are automatically applied when you use "Analyze with AI" in the Auto-Categorization section. 
                Active rules will be sent to the AI to help improve categorization accuracy.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add New Rule Form */}
      {showAddForm && (
        <div className="card">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Add New Rule</h4>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pattern (text to match in transaction description)
                </label>
                <input
                  type="text"
                  value={newRule.pattern || ''}
                  onChange={(e) => setNewRule({ ...newRule, pattern: e.target.value })}
                  placeholder="e.g., starbucks, uber, netflix"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={newRule.category || ''}
                  onChange={(e) => setNewRule({ ...newRule, category: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select category</option>
                  {state.categories.map(category => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (optional)
              </label>
              <input
                type="text"
                value={newRule.description || ''}
                onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                placeholder="Brief description of this rule"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={addRule}
                className="btn-primary flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>Add Rule</span>
              </button>
              
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewRule({});
                }}
                className="btn-secondary flex items-center space-x-2"
              >
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rules List */}
      <div className="card">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Custom Rules</h4>
        
        {rules.length === 0 ? (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No custom rules defined yet</p>
            <p className="text-sm text-gray-400">Add your first rule to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <div key={rule.id} className="border border-gray-200 rounded-lg p-4">
                {isEditing === rule.id ? (
                  // Edit Mode
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Pattern
                        </label>
                        <input
                          type="text"
                          value={editingRule.pattern || rule.pattern}
                          onChange={(e) => setEditingRule({ ...editingRule, pattern: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Category
                        </label>
                        <select
                          value={editingRule.category || rule.category}
                          onChange={(e) => setEditingRule({ ...editingRule, category: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        >
                          {state.categories.map(category => (
                            <option key={category.id} value={category.name}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={editingRule.description || rule.description}
                        onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateRule(rule.id)}
                        className="btn-primary flex items-center space-x-2"
                      >
                        <Save className="h-4 w-4" />
                        <span>Save</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          setIsEditing(null);
                          setEditingRule({});
                        }}
                        className="btn-secondary flex items-center space-x-2"
                      >
                        <X className="h-4 w-4" />
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getCategoryColor(rule.category) }}
                        ></div>
                        <span className="font-medium text-gray-900">{rule.category}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          rule.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Pattern:</span> "{rule.pattern}"
                        </p>
                        <p className="text-sm text-gray-500">{rule.description}</p>
                        <p className="text-xs text-gray-400">
                          Created: {new Date(rule.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => testRule(rule.pattern)}
                        className="text-sm text-blue-600 hover:text-blue-800 underline"
                      >
                        Test
                      </button>
                      
                      <button
                        onClick={() => {
                          setIsEditing(rule.id);
                          setEditingRule(rule);
                        }}
                        className="text-sm text-gray-600 hover:text-gray-800"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => toggleRule(rule.id)}
                        className={`text-sm ${rule.isActive ? 'text-orange-600' : 'text-green-600'} hover:underline`}
                      >
                        {rule.isActive ? 'Disable' : 'Enable'}
                      </button>
                      
                      <button
                        onClick={() => deleteRule(rule.id)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="card">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">How to Use Custom Rules</h4>
        
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h5 className="font-medium text-blue-800 mb-2">Creating Effective Patterns</h5>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Use specific keywords that appear in transaction descriptions</li>
              <li>• Patterns are case-insensitive and match partial text</li>
              <li>• Examples: "starbucks" matches "STARBUCKS COFFEE"</li>
              <li>• Use unique terms to avoid false matches</li>
            </ul>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h5 className="font-medium text-green-800 mb-2">Best Practices</h5>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Test your rules before applying them</li>
              <li>• Start with specific patterns, then generalize if needed</li>
              <li>• Use the "Test" button to see matching transactions</li>
              <li>• Disable rules that cause unwanted matches</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomCategorizationRules; 