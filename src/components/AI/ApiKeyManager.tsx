import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';

const API_KEY_STORAGE_KEY = 'gemini_api_key';

const ApiKeyManager: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'none' | 'valid' | 'invalid'>('none');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Load API key from localStorage on component mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (savedApiKey) {
      setApiKey(savedApiKey);
      setValidationStatus('valid'); // Assume it's valid if saved
    }
  }, []);

  const saveApiKey = () => {
    if (!apiKey.trim()) {
      setMessage({ type: 'error', text: 'Please enter an API key' });
      return;
    }

    // Basic validation - Gemini API keys typically start with 'AIza'
    if (!apiKey.startsWith('AIza')) {
      setMessage({ type: 'error', text: 'Invalid API key format. Gemini API keys should start with "AIza"' });
      return;
    }

    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    setValidationStatus('valid');
    setMessage({ type: 'success', text: 'API key saved successfully!' });
    
    // Clear message after 3 seconds
    setTimeout(() => setMessage(null), 3000);
  };

  const clearApiKey = () => {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    setApiKey('');
    setValidationStatus('none');
    setMessage({ type: 'info', text: 'API key cleared' });
    
    // Clear message after 3 seconds
    setTimeout(() => setMessage(null), 3000);
  };

  const testApiKey = async () => {
    if (!apiKey.trim()) {
      setMessage({ type: 'error', text: 'Please enter an API key first' });
      return;
    }

    setIsValidating(true);
    setMessage(null);

    try {
      // Simple test request to validate the API key
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: 'Hello'
                  }
                ]
              }
            ]
          }),
        }
      );

      if (response.ok) {
        setValidationStatus('valid');
        setMessage({ type: 'success', text: 'API key is valid and working!' });
        localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
      } else {
        setValidationStatus('invalid');
        setMessage({ type: 'error', text: 'API key is invalid or has insufficient permissions' });
      }
    } catch (error) {
      setValidationStatus('invalid');
      setMessage({ type: 'error', text: 'Failed to validate API key. Check your internet connection.' });
    } finally {
      setIsValidating(false);
      // Clear message after 5 seconds for validation results
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const getStoredApiKey = (): string | null => {
    return localStorage.getItem(API_KEY_STORAGE_KEY);
  };

  return (
    <div className="card">
      <div className="flex items-center space-x-2 mb-4">
        <Key className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Gemini API Key</h3>
      </div>

      <div className="space-y-4">
        {/* API Key Status */}
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            validationStatus === 'valid' ? 'bg-green-500' : 
            validationStatus === 'invalid' ? 'bg-red-500' : 
            'bg-gray-400'
          }`}></div>
          <span className="text-sm text-gray-600">
            {validationStatus === 'valid' ? 'AI Service Connected' : 
             validationStatus === 'invalid' ? 'AI Service Error' : 
             'AI Service Not Configured'}
          </span>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`p-3 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 border border-green-200' :
            message.type === 'error' ? 'bg-red-50 border border-red-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex items-center space-x-2">
              {message.type === 'success' && <CheckCircle className="h-4 w-4 text-green-600" />}
              {message.type === 'error' && <AlertTriangle className="h-4 w-4 text-red-600" />}
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

        {/* API Key Input */}
        <div className="space-y-2">
          <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700">
            API Key
          </label>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Gemini API key (AIza...)"
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showApiKey ? (
                <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={saveApiKey}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Save Key
          </button>
          <button
            onClick={testApiKey}
            disabled={isValidating}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isValidating ? 'Testing...' : 'Test Key'}
          </button>
          {apiKey && (
            <button
              onClick={clearApiKey}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
            >
              Clear Key
            </button>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">How to get your Gemini API Key:</h4>
          <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
            <li>Visit <a 
              href="https://makersuite.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline inline-flex items-center"
            >
              Google AI Studio <ExternalLink className="h-3 w-3 ml-1" />
            </a></li>
            <li>Sign in with your Google account</li>
            <li>Click "Create API Key"</li>
            <li>Copy the generated key and paste it above</li>
          </ol>
          <p className="text-xs text-gray-500 mt-2">
            Your API key is stored locally in your browser and never sent to our servers.
          </p>
        </div>
      </div>
    </div>
  );
};

// Export function to get API key from localStorage
export const getStoredApiKey = (): string | null => {
  return localStorage.getItem(API_KEY_STORAGE_KEY);
};

export default ApiKeyManager;