import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeftRight, 
  ChevronDown, 
  Twitter,
  Globe,
  MessageCircle,
  RefreshCcw,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import {
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Line
} from 'recharts';

const TokenTrading = ({ token, liquidityPool, launchBobService, onBack }) => {
  const [tradeType, setTradeType] = useState('buy');
  const [amount, setAmount] = useState('');
  const [tokenData, setTokenData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [userBalance, setUserBalance] = useState(null);
  const [priceImpact, setPriceImpact] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTokenData = useCallback(async () => {
    if (!token?.token_id) {
      console.error('No token ID provided');
      setError('Invalid token');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await launchBobService.getTokenData(token.token_id);
      if (!data) {
        throw new Error('No data returned');
      }
      setTokenData(data);
      
      // Get cached token info
      const cachedInfo = launchBobService.getCachedTokenInfo(token.token_id);
      if (cachedInfo) {
        // Update token info if available
        token = { ...token, ...cachedInfo };
      }

      // Fetch user's balance for this token
      const principal = launchBobService.getPrincipal();
      if (principal) {
        const balance = await launchBobService.getTokenBalance(token.token_id, principal);
        setUserBalance(balance);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching token data:', err);
      setError('Failed to fetch token data');
    } finally {
      setLoading(false);
    }
  }, [token, launchBobService]);

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    fetchTokenData();
    const intervalId = setInterval(fetchTokenData, 30000);
    return () => clearInterval(intervalId);
  }, [fetchTokenData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTokenData();
    setRefreshing(false);
  };

  const calculatePriceImpact = useCallback((inputAmount) => {
    if (!inputAmount || !liquidityPool) return 0;
    
    const currentPrice = calculatePrice();
    const reserveIcp = Number(liquidityPool.reserve_icp);
    const reserveToken = Number(liquidityPool.reserve_token);
    const amount = Number(inputAmount);

    if (tradeType === 'buy') {
      const newReserveIcp = reserveIcp + amount * 1e8;
      const newPrice = newReserveIcp / reserveToken;
      return ((newPrice - currentPrice) / currentPrice) * 100;
    } else {
      const newReserveIcp = reserveIcp - amount * 1e8;
      const newPrice = newReserveIcp / reserveToken;
      return ((currentPrice - newPrice) / currentPrice) * 100;
    }
  }, [tradeType, liquidityPool]);

  const handleAmountChange = (value) => {
    setAmount(value);
    const impact = calculatePriceImpact(value);
    setPriceImpact(impact);
  };

  const handleTrade = async () => {
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!token?.token_id) {
      setError('Invalid token');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const amountE8s = BigInt(Math.floor(Number(amount) * 1e8));
      let result;

      if (tradeType === 'buy') {
        result = await launchBobService.buyToken(token.token_id, amountE8s);
      } else {
        result = await launchBobService.sellToken(token.token_id, amountE8s);
      }

      if ('Ok' in result) {
        setAmount('');
        setPriceImpact(0);
        await fetchTokenData();
      } else {
        throw new Error(result.Err);
      }
    } catch (err) {
      console.error(`Failed to ${tradeType}:`, err);
      setError(err.message || `Failed to ${tradeType} token`);
    } finally {
      setProcessing(false);
    }
  };
const formatPrice = (value) => {
    if (!value) return '0';
    return (Number(value) / 1e8).toFixed(8);
  };

  const formatBalance = (value) => {
    if (!value) return '0';
    return (Number(value) / 1e8).toFixed(4);
  };

  const calculatePrice = useCallback(() => {
    if (!liquidityPool) return '0';
    
    const reserveIcp = Number(liquidityPool.reserve_icp);
    const reserveToken = Number(liquidityPool.reserve_token);
    if (!reserveToken) return '0';
    
    return (reserveIcp / reserveToken).toFixed(8);
  }, [liquidityPool]);

  const processCandles = useCallback((candles = []) => {
    return candles.map(candle => ({
      time: new Date(Number(candle.time) / 1e6).toLocaleDateString(),
      open: Number(candle.open),
      high: Number(candle.high),
      low: Number(candle.low),
      close: Number(candle.close),
      volume: candle.volume || 0,
    }));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Token Info */}
      <div className="flex items-center justify-between bg-gray-900 border border-purple-900/30 rounded-lg p-4">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onBack}
            className="text-purple-400 hover:text-purple-300 transition-colors"
          >
            <ChevronDown className="w-6 h-6 transform rotate-90" />
          </button>
          
          <div className="flex items-center space-x-4">
            {token.image && (
              <img
                src={token.image}
                alt={token.name}
                className="w-12 h-12 rounded-full object-cover bg-gray-800"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" fill="%231F2937"/><text x="24" y="24" font-family="Arial" font-size="14" fill="%239CA3AF" text-anchor="middle" dy=".3em">?</text></svg>';
                }}
              />
            )}
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-2xl font-bold text-white">{token.name}</h2>
                <span className="text-lg text-gray-400">({token.ticker})</span>
              </div>
              <div className="flex items-center space-x-4 mt-1">
                {token.maybe_website[0] && (
                  <a 
                    href={token.maybe_website[0]} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 transition-colors"
                    title="Website"
                  >
                    <Globe className="w-4 h-4" />
                  </a>
                )}
                {token.maybe_twitter[0] && (
                  <a 
                    href={`https://twitter.com/${token.maybe_twitter[0]}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 transition-colors"
                    title="Twitter"
                  >
                    <Twitter className="w-4 h-4" />
                  </a>
                )}
                {token.maybe_telegram[0] && (
                  <a 
                    href={`https://t.me/${token.maybe_telegram[0]}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 transition-colors"
                    title="Telegram"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={`p-2 rounded-lg transition-colors ${
            refreshing 
              ? 'bg-purple-600/50 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700'
          }`}
          title="Refresh data"
        >
          <RefreshCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Price Chart */}
      <div className="bg-gray-900 border border-purple-900/30 rounded-lg p-6">
        <div className="h-96">
          {tokenData && tokenData.candles && tokenData.candles.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={processCandles(tokenData.candles)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF' }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF' }}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '0.5rem',
                  }}
                  itemStyle={{ color: '#E5E7EB' }}
                  labelStyle={{ color: '#9CA3AF' }}
                />
                <Area
                  type="monotone"
                  dataKey="close"
                  fill="rgba(139, 92, 246, 0.1)"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="high"
                  stroke="#10B981"
                  dot={false}
                  strokeWidth={1}
                />
                <Line
                  type="monotone"
                  dataKey="low"
                  stroke="#EF4444"
                  dot={false}
                  strokeWidth={1}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              No trading data available
            </div>
          )}
        </div>
      </div>

      {/* Trading Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trading Panel */}
        <div className="lg:col-span-2 bg-gray-900 border border-purple-900/30 rounded-lg p-6">
          <div className="flex justify-between mb-6">
            <button
              className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                tradeType === 'buy'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
              onClick={() => {
                setTradeType('buy');
                setAmount('');
                setPriceImpact(0);
              }}
            >
              Buy
            </button>
            <button
              className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                tradeType === 'sell'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
              onClick={() => {
                setTradeType('sell');
                setAmount('');
                setPriceImpact(0);
              }}
            >
              Sell
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Amount ({tradeType === 'buy' ? 'ICP' : token.ticker})
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className="w-full bg-gray-800 border border-purple-900/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                  placeholder="0.00"
                  step="0.000001"
                  min="0"
                />
                {userBalance !== null && tradeType === 'sell' && (
                  <button
                    onClick={() => handleAmountChange(formatBalance(userBalance))}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm text-purple-400 hover:text-purple-300"
                  >
                    MAX
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Price:</span>
                <span className="text-white">{calculatePrice()} ICP per {token.ticker}</span>
              </div>

              {priceImpact !== 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Price Impact:</span>
                  <span className={priceImpact > 5 ? 'text-red-400' : 'text-yellow-400'}>
                    {Math.abs(priceImpact).toFixed(2)}%
                    {priceImpact > 0 ? <TrendingUp className="w-4 h-4 inline ml-1" /> : <TrendingDown className="w-4 h-4 inline ml-1" />}
                  </span>
                </div>
              )}

              {userBalance !== null && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Your Balance:</span>
                  <span className="text-white">
                    {formatBalance(userBalance)} {token.ticker}
                  </span>
                </div>
              )}
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-900/20 p-2 rounded">
                {error}
              </div>
            )}

            <button
              onClick={handleTrade}
              disabled={processing || !amount || priceImpact > 15}
              className={`w-full px-6 py-3 rounded-lg transition-all duration-200 ${
                processing || !amount || priceImpact > 15
                  ? 'bg-purple-600/50 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 transform hover:scale-105'
              } text-white font-medium flex items-center justify-center space-x-2`}
            >
              {processing ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <ArrowLeftRight className="w-5 h-5" />
                  <span>
                    {tradeType === 'buy' ? 'Buy' : 'Sell'} {token.ticker}
                    {priceImpact > 15 && ' (Price impact too high)'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Token Info Panel */}
        <div className="bg-gray-900 border border-purple-900/30 rounded-lg p-6">
          <h3 className="text-lg font-medium text-white mb-4">Token Info</h3>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-400">Total Supply</div>
              <div className="text-white">{formatPrice(liquidityPool.total_supply)} {token.ticker}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Liquidity</div>
              <div className="text-white">{formatPrice(liquidityPool.reserve_icp)} ICP</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Token Reserve</div>
              <div className="text-white">{formatPrice(liquidityPool.reserve_token)} {token.ticker}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Description</div>
              <div className="text-white whitespace-pre-wrap">{token.description}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenTrading;