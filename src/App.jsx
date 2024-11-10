import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Actor, HttpAgent } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
import { idlFactory } from './declarations/launch_bob_fun.did.js';
import { 
  Search, Wallet, ExternalLink, Twitter, MessageCircle, 
  Clock, Star, Sparkles, ShoppingCart, AlertCircle, Image, Upload,
  Settings
} from 'lucide-react';

// Constants
const canisterId = import.meta.env.VITE_CANISTER_ID;
const host = import.meta.env.VITE_HOST;
const identityProvider = import.meta.env.VITE_II_URL;
const BATCH_SIZE = 10;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

// Utility functions
const formatNumber = (num) => {
  if (!num) return '0';
  const value = Number(num);
  if (value === 0) return '0';
  if (value < 1e-8) {
    return value.toFixed(10).replace(/\.?0+$/, '');
  }
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8
  }).format(value);
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  try {
    const date = new Date(Number(timestamp) / 1000000);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch (error) {
    return '';
  }
};

// Components
const TickerNotification = ({ latestToken }) => {
  if (!latestToken) return null;
  
  return (
    <div className="w-full bg-[#0A0A0A] border-b border-purple-500/10 py-2 px-4 fixed top-0 z-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-purple-300/80 text-sm">
            <Sparkles size={14} className="text-purple-400" />
            <span>Latest Launch: {latestToken.name} ({latestToken.ticker})</span>
          </div>
          <span className="text-purple-400/60 text-xs">
            {formatTimestamp(latestToken.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
};

const AutoBuyInterface = () => {
  const [settings, setSettings] = useState({
    maxPrice: '',
    amount: '',
    autoSell: false,
    profitTarget: '',
  });

  return (
    <div className="max-w-2xl mx-auto bg-[#0A0A0A] rounded-lg border border-purple-500/10 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings size={24} className="text-purple-400" />
          Auto Buy Settings
        </h2>
        <span className="px-3 py-1 bg-purple-500/10 rounded-full text-purple-400 text-sm">
          Coming Soon
        </span>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-purple-300/80 text-sm mb-2">Max Price (ICP)</label>
            <input
              type="number"
              placeholder="0.00"
              className="w-full bg-black border border-purple-500/20 rounded-lg px-4 py-2 text-white"
              disabled
            />
          </div>
          <div>
            <label className="block text-purple-300/80 text-sm mb-2">Amount (ICP)</label>
            <input
              type="number"
              placeholder="0.00"
              className="w-full bg-black border border-purple-500/20 rounded-lg px-4 py-2 text-white"
              disabled
            />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-purple-300/80">
            <input
              type="checkbox"
              className="rounded border-purple-500/20 bg-black text-purple-500"
              disabled
            />
            Enable Auto Sell
          </label>
        </div>

        <button
          className="w-full px-4 py-3 bg-purple-500/10 text-purple-300 rounded-lg font-medium cursor-not-allowed"
          disabled
        >
          Enable Auto Buy
        </button>

        <div className="mt-6 bg-purple-500/5 border border-purple-500/10 rounded-lg p-4">
          <h3 className="text-purple-300 font-medium mb-2">How it works</h3>
          <ul className="space-y-2 text-sm text-purple-300/70">
            <li>• Set your maximum price per token</li>
            <li>• Set the amount of ICP you want to spend</li>
            <li>• Optionally enable auto-sell with profit targets</li>
            <li>• System will automatically purchase new tokens at launch</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
const CreateTokenForm = ({ onSubmit, isSubmitting }) => {
  const [formData, setFormData] = useState({
    name: '',
    ticker: '',
    description: '',
    image: '',
    website: '',
    twitter: '',
    telegram: ''
  });
  const [imagePreview, setImagePreview] = useState('');

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_SIZE) {
      alert('Image must be less than 5MB');
      return;
    }

    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      setFormData(prev => ({ ...prev, image: base64 }));
      setImagePreview(base64);
    } catch (error) {
      console.error('Error reading file:', error);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="max-w-2xl mx-auto bg-[#0A0A0A] rounded-xl border border-purple-500/10 p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Create New Token</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-4">
          <div>
            <label className="block text-purple-300 text-sm mb-2">Token Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Magic Conch Shell"
              className="w-full bg-black border border-purple-500/20 rounded-lg px-4 py-2 text-white"
              required
            />
          </div>
          
          <div>
            <label className="block text-purple-300 text-sm mb-2">Ticker (3-8 characters)</label>
            <input
              type="text"
              name="ticker"
              value={formData.ticker}
              onChange={handleChange}
              placeholder="MCS"
              className="w-full bg-black border border-purple-500/20 rounded-lg px-4 py-2 text-white uppercase"
              pattern="[A-Za-z]{3,8}"
              title="Ticker must be 3-8 characters."
              required
            />
          </div>

          <div>
            <label className="block text-purple-300 text-sm mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Post something here..."
              className="w-full bg-black border border-purple-500/20 rounded-lg px-4 py-2 text-white h-24"
              maxLength={500}
              required
            />
            <span className="text-xs text-purple-300/40 mt-1">
              {formData.description.length}/500 characters
            </span>
          </div>

          <div>
            <label className="block text-purple-300 text-sm mb-2">Token Image</label>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="image"
                    value={formData.image}
                    onChange={handleChange}
                    placeholder="Image URL or upload file..."
                    className="flex-1 bg-black border border-purple-500/20 rounded-lg px-4 py-2 text-white"
                  />
                  <label className="px-4 py-2 bg-purple-500/10 text-purple-300 rounded-lg hover:bg-purple-500/20 cursor-pointer">
                    <Upload size={18} />
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                  </label>
                </div>
                <p className="text-xs text-purple-300/40 mt-1">
                  Maximum size: 5MB. Supports PNG, JPG
                </p>
              </div>
              {imagePreview && (
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-black/40 flex-shrink-0">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-purple-300 text-sm mb-2">Website (optional)</label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://"
                className="w-full bg-black border border-purple-500/20 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-purple-300 text-sm mb-2">Twitter (optional)</label>
              <input
                type="url"
                name="twitter"
                value={formData.twitter}
                onChange={handleChange}
                placeholder="https://x.com/..."
                className="w-full bg-black border border-purple-500/20 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-purple-300 text-sm mb-2">Telegram (optional)</label>
              <input
                type="url"
                name="telegram"
                value={formData.telegram}
                onChange={handleChange}
                placeholder="https://t.me/..."
                className="w-full bg-black border border-purple-500/20 rounded-lg px-4 py-2 text-white"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`
            w-full mt-6 px-6 py-3 rounded-lg font-medium text-white
            ${isSubmitting 
              ? 'bg-purple-500/50 cursor-not-allowed' 
              : 'bg-purple-500 hover:bg-purple-600 shadow-lg shadow-purple-500/25'}
          `}
        >
          {isSubmitting ? 'Creating Token...' : 'Create Token'}
        </button>
      </form>
    </div>
  );
};

const TokenCard = React.forwardRef(({ token_info, liquidity_pool }, ref) => {
  if (!token_info || !liquidity_pool) return null;

  const calculatePrice = () => {
    const reserve_icp = Number(liquidity_pool.reserve_icp) / 1e8;
    const reserve_token = Number(liquidity_pool.reserve_token) / 1e8;
    return reserve_token ? reserve_icp / reserve_token : 0;
  };
  
  return (
    <div ref={ref} className="bg-[#0A0A0A] rounded-lg border border-purple-500/10 hover:border-purple-500/30 transition-all duration-300">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-bold text-white truncate flex items-center gap-2">
              {token_info.name}
              <span className="text-sm text-purple-400 font-mono bg-purple-500/10 px-2 py-0.5 rounded-full">
                {token_info.ticker}
              </span>
            </h3>
            <p className="text-gray-400 text-sm mt-1 line-clamp-2">
              {token_info.description}
            </p>
          </div>
          {token_info.image && (
            <img 
              src={token_info.image} 
              alt={token_info.name} 
              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-black/40 rounded-lg p-3">
            <p className="text-purple-300/70 text-xs font-medium mb-1">Price</p>
            <p className="text-white font-bold text-sm">
              {formatNumber(calculatePrice())} ICP
            </p>
          </div>
          <div className="bg-black/40 rounded-lg p-3">
            <p className="text-purple-300/70 text-xs font-medium mb-1">Market Cap</p>
            <p className="text-white font-bold text-sm">
              {formatNumber(Number(liquidity_pool.reserve_icp) / 1e8)} ICP
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-1">
            {token_info.maybe_twitter?.[0] && (
              <a 
                href={token_info.maybe_twitter[0]} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-lg text-purple-300/60 hover:text-purple-300 hover:bg-purple-500/10 transition-all"
              >
                <Twitter size={16} />
              </a>
            )}
            {token_info.maybe_telegram?.[0] && (
              <a 
                href={token_info.maybe_telegram[0]} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-lg text-purple-300/60 hover:text-purple-300 hover:bg-purple-500/10 transition-all"
              >
                <MessageCircle size={16} />
              </a>
            )}
            {token_info.maybe_website && (
              <a 
                href={token_info.maybe_website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-lg text-purple-300/60 hover:text-purple-300 hover:bg-purple-500/10 transition-all"
              >
                <ExternalLink size={16} />
              </a>
            )}
          </div>
          <span className="text-purple-300/40 text-xs">
            {formatTimestamp(token_info.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
});
const Navigation = ({ activeTab, onTabChange, searchQuery, onSearchChange }) => {
  const tabs = [
    { id: 'recent', icon: Clock, label: 'Recent' },
    { id: 'autobuy', icon: ShoppingCart, label: 'Auto Buy' },
    { id: 'featured', icon: Star, label: 'Featured' },
    { id: 'create', icon: Sparkles, label: 'Create' }
  ];

  return (
    <div className="space-y-6 sticky top-12 bg-black z-40 pb-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600">
          MCSM
        </h1>
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search tokens..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-10 bg-[#0A0A0A] border border-purple-500/20 rounded-lg pl-4 pr-10 text-white placeholder-gray-500"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-500/40" size={16} />
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-1 bg-[#0A0A0A] rounded-lg p-1 border border-purple-500/10">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`
              flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === id 
                ? 'bg-purple-500 text-white' 
                : 'text-purple-300/60 hover:text-purple-300 hover:bg-purple-500/10'}
            `}
          >
            <Icon size={16} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const App = () => {
  const [tokens, setTokens] = useState([]);
  const [filteredTokens, setFilteredTokens] = useState([]);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('recent');
  const [authClient, setAuthClient] = useState(null);
  const [actor, setActor] = useState(null);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [latestToken, setLatestToken] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const observer = useRef();
  const lastTokenElementRef = useCallback(node => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoading, hasMore]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('Initializing auth...');
        const client = await AuthClient.create();
        setAuthClient(client);
        
        const isAuthenticated = await client.isAuthenticated();
        setIsWalletConnected(isAuthenticated);
        
        const identity = isAuthenticated ? client.getIdentity() : undefined;
        const agent = new HttpAgent({ identity, host });
        
        if (host !== "https://ic0.app") {
          await agent.fetchRootKey().catch(console.error);
        }

        const newActor = Actor.createActor(idlFactory, {
          agent,
          canisterId,
        });
        
        setActor(newActor);
      } catch (error) {
        console.error('Error initializing auth:', error);
        setError('Failed to initialize. Please try again.');
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  useEffect(() => {
    const fetchTokens = async () => {
      if (!actor) return;
      
      try {
        setIsLoading(true);
        let fetchedTokens;
        
        switch (activeTab) {
          case 'recent':
            // Changed to use CreatedAtSkipBatches with page count
            fetchedTokens = await actor.get_tokens({ 
              CreatedAtSkipBatches: { batch_count: BigInt(page) }
            }, BigInt(BATCH_SIZE));
            
            if (page === 0 && fetchedTokens.length > 0) {
              setLatestToken(fetchedTokens[0][0]);
            }
            break;
          case 'featured':
            const robertChoice = await actor.get_robert_choice();
            fetchedTokens = [robertChoice];
            setHasMore(false);
            break;
          case 'autobuy':
            fetchedTokens = await actor.get_tokens({ ReserveIcp: null }, BigInt(BATCH_SIZE));
            break;
          default:
            fetchedTokens = [];
        }
  
        if (fetchedTokens.length < BATCH_SIZE) {
          setHasMore(false);
        }
  
        if (page === 0) {
          setTokens(fetchedTokens);
          setFilteredTokens(fetchedTokens);
        } else {
          setTokens(prev => [...prev, ...fetchedTokens]);
          setFilteredTokens(prev => [...prev, ...fetchedTokens]);
        }
      } catch (error) {
        console.error('Error fetching tokens:', error);
        setError('Failed to load tokens. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
  
    if (actor) {
      fetchTokens();
    }
  }, [actor, activeTab, page]);

  useEffect(() => {
    if (!tokens.length) return;
    
    const filtered = tokens.filter(([token_info]) => {
      const searchLower = searchQuery.toLowerCase();
      return (
        token_info.name.toLowerCase().includes(searchLower) ||
        token_info.ticker.toLowerCase().includes(searchLower) ||
        token_info.description.toLowerCase().includes(searchLower)
      );
    });
    setFilteredTokens(filtered);
  }, [searchQuery, tokens]);

  const handleCreateToken = async (formData) => {
    if (!actor || !isWalletConnected) return;
    
    setIsSubmitting(true);
    try {
      const createTokenArg = {
        name: formData.name,
        ticker: formData.ticker.toUpperCase(),
        description: formData.description,
        image: formData.image,
        maybe_website: formData.website ? [formData.website] : [],
        maybe_twitter: formData.twitter ? [formData.twitter] : [],
        maybe_telegram: formData.telegram ? [formData.telegram] : []
      };

      await actor.create_token(createTokenArg);
      setActiveTab('recent');
      setPage(0); // Reset to first page
      setHasMore(true); // Reset infinite scroll
    } catch (error) {
      console.error('Error creating token:', error);
      setError('Failed to create token. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const connectWallet = async () => {
    try {
      await authClient?.login({
        identityProvider,
        onSuccess: async () => {
          setIsWalletConnected(true);
          const identity = authClient.getIdentity();
          const agent = new HttpAgent({ identity, host });
          
          if (host !== "https://ic0.app") {
            await agent.fetchRootKey();
          }
          
          const newActor = Actor.createActor(idlFactory, {
            agent,
            canisterId,
          });
          setActor(newActor);
        },
      });
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setError('Failed to connect wallet. Please try again.');
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab !== activeTab) {
      setPage(0);
      setHasMore(true);
      setError(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pt-12">
      <TickerNotification latestToken={latestToken} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-end mb-8">
          <button
            onClick={connectWallet}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
              ${isWalletConnected 
                ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20' 
                : 'bg-purple-500 text-white hover:bg-purple-600'}
            `}
          >
            <Wallet size={18} />
            {isWalletConnected ? 'Connected' : 'Connect Wallet'}
          </button>
        </div>

        <Navigation 
          activeTab={activeTab}
          onTabChange={handleTabChange}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {activeTab === 'create' ? (
          <CreateTokenForm onSubmit={handleCreateToken} isSubmitting={isSubmitting} />
        ) : activeTab === 'autobuy' ? (
          <AutoBuyInterface />
        ) : error ? (
          <div className="flex items-center justify-center h-64 text-red-400">
            <AlertCircle className="mr-2" />
            <span>{error}</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {filteredTokens.map(([token_info, liquidity_pool], index) => (
                <TokenCard 
                  key={`${token_info.ticker}-${index}`} 
                  token_info={token_info} 
                  liquidity_pool={liquidity_pool}
                  ref={index === filteredTokens.length - 1 ? lastTokenElementRef : null}
                />
              ))}
            </div>
            
            {isLoading && (
              <div className="flex justify-center mt-8">
                <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default App;