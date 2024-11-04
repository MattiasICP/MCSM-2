import React, { useState } from 'react';
import { 
  Globe, 
  Twitter, 
  MessageCircle, 
  Image as ImageIcon,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

const TokenCreation = ({ launchBobService }) => {
  const [formData, setFormData] = useState({
    ticker: '',
    name: '',
    description: '',
    image: '',
    website: '',
    twitter: '',
    telegram: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
    setSuccess(false);
  };

  const validateForm = () => {
    if (!formData.ticker) return 'Ticker is required';
    if (!formData.name) return 'Name is required';
    if (!formData.description) return 'Description is required';
    if (!formData.image) return 'Image URL is required';
    if (formData.ticker.length > 10) return 'Ticker must be 10 characters or less';
    if (formData.name.length > 50) return 'Name must be 50 characters or less';
    if (formData.description.length > 500) return 'Description must be 500 characters or less';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const createTokenArg = {
        ticker: formData.ticker,
        name: formData.name,
        description: formData.description,
        image: formData.image,
        maybe_website: formData.website ? [formData.website] : [],
        maybe_twitter: formData.twitter ? [formData.twitter] : [],
        maybe_telegram: formData.telegram ? [formData.telegram]  : []
      };

      await launchBobService.createToken(createTokenArg);
      setSuccess(true);
      setFormData({
        ticker: '',
        name: '',
        description: '',
        image: '',
        website: '',
        twitter: '',
        telegram: ''
      });
    } catch (err) {
      setError(err.message || 'Failed to create token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gray-900 border border-purple-900/30 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Create New Token</h2>

        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-400 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-900/20 border border-green-500/30 rounded-lg p-4 text-green-400 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            Token created successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Required Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Ticker Symbol*
              </label>
              <input
                type="text"
                name="ticker"
                value={formData.ticker}
                onChange={handleChange}
                className="w-full bg-gray-800 border border-purple-900/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                placeholder="e.g., BTC"
                maxLength={10}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Token Name*
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full bg-gray-800 border border-purple-900/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                placeholder="e.g., Bitcoin"
                maxLength={50}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Description*
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="w-full bg-gray-800 border border-purple-900/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-600 h-32"
                placeholder="Describe your token..."
                maxLength={500}
              />
              <div className="text-right text-sm text-gray-400 mt-1">
                {formData.description.length}/500
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Token Image URL*
              </label>
              <div className="relative">
                <input
                  type="url"
                  name="image"
                  value={formData.image}
                  onChange={handleChange}
                  className="w-full bg-gray-800 border border-purple-900/30 rounded-lg px-4 py-2 pl-10 text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                  placeholder="https://..."
                />
                <ImageIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Optional Fields */}
          <div className="border-t border-purple-900/30 pt-6 space-y-4">
            <h3 className="text-lg font-medium text-white mb-4">Additional Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Website
              </label>
              <div className="relative">
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  className="w-full bg-gray-800 border border-purple-900/30 rounded-lg px-4 py-2 pl-10 text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                  placeholder="https://..."
                />
                <Globe className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Twitter Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="twitter"
                  value={formData.twitter}
                  onChange={handleChange}
                  className="w-full bg-gray-800 border border-purple-900/30 rounded-lg px-4 py-2 pl-10 text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                  placeholder="username (without @)"
                />
                <Twitter className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Telegram Group
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="telegram"
                  value={formData.telegram}
                  onChange={handleChange}
                  className="w-full bg-gray-800 border border-purple-900/30 rounded-lg px-4 py-2 pl-10 text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                  placeholder="group username"
                />
                <MessageCircle className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full px-6 py-3 rounded-lg transition-all duration-200 ${
              loading
                ? 'bg-purple-600/50 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700 transform hover:scale-105'
            } text-white font-medium flex items-center justify-center space-x-2`}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              'Create Token'
            )}
          </button>
        </form>
      </div>

      {/* Preview Card */}
      {(formData.name || formData.description || formData.image) && (
        <div className="mt-8 bg-gray-900 border border-purple-900/30 rounded-lg p-6">
          <h3 className="text-lg font-medium text-white mb-4">Preview</h3>
          <div className="rounded-lg overflow-hidden">
            {formData.image && (
              <img 
                src={formData.image} 
                alt="Token Preview" 
                className="w-full h-48 object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%234B5563"/><text x="50" y="50" font-family="Arial" font-size="14" fill="%239CA3AF" text-anchor="middle" dy=".3em">Invalid Image</text></svg>';
                }}
              />
            )}
            <div className="p-4 bg-gray-800">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-lg font-medium text-white">{formData.name || 'Token Name'}</h4>
                <span className="text-sm text-purple-400">{formData.ticker || 'TICKER'}</span>
              </div>
              <p className="text-gray-400 text-sm">
                {formData.description || 'Token description will appear here...'}
              </p>
              {(formData.website || formData.twitter || formData.telegram) && (
                <div className="flex space-x-4 mt-4">
                  {formData.website && (
                    <Globe className="w-5 h-5 text-purple-400" />
                  )}
                  {formData.twitter && (
                    <Twitter className="w-5 h-5 text-purple-400" />
                  )}
                  {formData.telegram && (
                    <MessageCircle className="w-5 h-5 text-purple-400" />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenCreation;