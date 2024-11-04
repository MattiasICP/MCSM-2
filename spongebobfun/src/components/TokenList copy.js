import React, { useState, useEffect, useCallback } from 'react';
import { ArrowUpRight, TrendingUp, SortAsc, Search, RefreshCcw } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

const TokenList = ({ onSelectToken, launchBobService }) => {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest', 'liquidity', 'name'
  const [sortAsc, setSortAsc] = useState(true); // Ascending or descending sort toggle
  const [refreshing, setRefreshing] = useState(false);

  const fetchTokens = useCallback(async () => {
    try {
      setRefreshing(true);
      let orderBy;
      switch (sortOrder) {
        case 'liquidity':
          orderBy = { ReserveIcp: null };
          break;
        case 'name':
          orderBy = { CreatedAt: null }; // Sort by created time as a fallback
          break;
        case 'newest':
        default:
          orderBy = { CreatedAt: null };
      }

      const result = await launchBobService.getTokens(orderBy, 50n);
      setTokens(result);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch tokens:', err);
      setError('Failed to fetch tokens');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [launchBobService, sortOrder]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  useEffect(() => {
    const intervalId = setInterval(fetchTokens, 1000);
    return () => clearInterval(intervalId);
  }, [fetchTokens]);

  const formatReserves = (value) => (Number(value) / 1e8).toFixed(2);

  const calculatePrice = (liquidityPool) => {
    const reserveIcp = Number(liquidityPool.reserve_icp);
    const reserveToken = Number(liquidityPool.reserve_token);
    return reserveToken ? (reserveIcp / reserveToken).toFixed(8) : '0';
  };

  const filterTokens = useCallback(() => {
    if (!searchTerm) return tokens;
    return tokens.filter(([tokenInfo]) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        tokenInfo.name.toLowerCase().includes(searchLower) ||
        tokenInfo.ticker.toLowerCase().includes(searchLower) ||
        tokenInfo.description.toLowerCase().includes(searchLower)
      );
    });
  }, [tokens, searchTerm]);

  const sortTokens = useCallback(
    (filteredTokens) => {
      const sortedTokens = [...filteredTokens].sort((a, b) => {
        switch (sortOrder) {
          case 'liquidity':
            return sortAsc
              ? Number(a[1].reserve_icp) - Number(b[1].reserve_icp)
              : Number(b[1].reserve_icp) - Number(a[1].reserve_icp);
          case 'name':
            return sortAsc
              ? a[0].name.localeCompare(b[0].name)
              : b[0].name.localeCompare(a[0].name);
          case 'newest':
          default:
            return filteredTokens; // Default to API order if not sorted
        }
      });
      return sortedTokens;
    },
    [sortOrder, sortAsc]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const filteredAndSortedTokens = sortTokens(filterTokens());

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex justify-between items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search tokens..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-800 border border-purple-900/30 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="bg-gray-800 border border-purple-900/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
          >
            <option value="newest">Newest First</option>
            <option value="liquidity">Highest Liquidity</option>
            <option value="name">Name</option>
          </select>
          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="p-2 rounded-lg bg-gray-800 hover:bg-purple-700 transition-colors"
          >
            <SortAsc
              className={`w-4 h-4 transform transition-transform ${
                sortAsc ? 'rotate-180' : 'rotate-0'
              }`}
            />
          </button>
          <button
            onClick={fetchTokens}
            disabled={refreshing}
            className={`p-2 rounded-lg transition-colors ${
              refreshing ? 'bg-purple-600/50 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            <RefreshCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error ? (
        <div className="text-red-400 p-4 bg-red-900/20 rounded-lg">{error}</div>
      ) : (
        <div className="bg-gray-900 rounded-lg border border-purple-900/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-purple-900/30">
                  <th className="px-6 py-3 text-left text-xs font-medium text-purple-400 uppercase tracking-wider">Token</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-purple-400 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-purple-400 uppercase tracking-wider">Liquidity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-purple-400 uppercase tracking-wider">Volume</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-purple-400 uppercase tracking-wider">Chart</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-purple-400 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-900/30">
                {filteredAndSortedTokens.map(([tokenInfo, liquidityPool], index) => {
                  const price = calculatePrice(liquidityPool);
                  const liquidity = formatReserves(liquidityPool.reserve_icp);
                  const cachedInfo = launchBobService.getCachedTokenInfo(tokenInfo.token_id);

                  const chartData = Array.from({ length: 20 }, (_, i) => ({
                    value: Number(price) * (1 + Math.sin(i / 3) * 0.1),
                  }));

                  return (
                    <tr
                      key={`${tokenInfo.token_id}-${index}`}
                      className="hover:bg-purple-900/10 transition-colors cursor-pointer"
                      onClick={() => onSelectToken(tokenInfo, liquidityPool)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-4">
                          {cachedInfo?.image && (
                            <div className="flex-shrink-0">
                              <img
                                src={cachedInfo.image}
                                alt={tokenInfo.name}
                                className="w-10 h-10 rounded-full object-cover bg-gray-800"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src =
                                    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect width="40" height="40" fill="%231F2937"/><text x="20" y="20" font-family="Arial" font-size="12" fill="%239CA3AF" text-anchor="middle" dy=".3em">?</text></svg>';
                                }}
                              />
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-white">{tokenInfo.name}</div>
                            <div className="text-sm text-gray-400">{tokenInfo.ticker}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-white">{price} ICP</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-white">{liquidity} ICP</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-white">
                          <TrendingUp className="w-4 h-4 text-green-400 inline-block mr-1" />
                          {(Number(liquidity) * 0.1).toFixed(2)} ICP
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-16 w-32">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                              <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={1} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          className="text-purple-400 hover:text-purple-300 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectToken(tokenInfo, liquidityPool);
                          }}
                        >
                          <ArrowUpRight className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredAndSortedTokens.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                      {searchTerm ? 'No tokens found matching your search' : 'No tokens available'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenList;
