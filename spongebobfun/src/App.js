import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Settings, Wallet, Eye, EyeOff, PlusCircle, Coins } from 'lucide-react';
import { launchBobService } from './services/launchBobService';
import TokenList from './components/TokenList';
import TokenTrading from './components/TokenTrading';
import TokenCreation from './components/TokenCreation';

const App = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [autoBuyAmount, setAutoBuyAmount] = useState('');
  const [activeAutoBuys, setActiveAutoBuys] = useState([]);
  const [recentPurchases, setRecentPurchases] = useState([]);
  const [showBalance, setShowBalance] = useState(false);
  const [selectedTab, setSelectedTab] = useState('tokens');
  const [icpBalance, setIcpBalance] = useState('0.00');
  const [selectedToken, setSelectedToken] = useState(null);
  const [autoBuyCallbacks, setAutoBuyCallbacks] = useState(new Map());
  const [loading, setLoading] = useState(true);

  const fetchBalance = useCallback(async () => {
    try {
      const balance = await launchBobService.getICPBalance();
      setIcpBalance((Number(balance) / 1e8).toFixed(2));
    } catch (err) {
      console.error('Failed to fetch ICP balance:', err);
    }
  }, []);

  const fetchUserData = useCallback(async () => {
    try {
      await fetchBalance();
      
      const lastOrder = await launchBobService.getLastOrder();
      if (lastOrder) {
        const timestamp = Number(lastOrder[0].ts);
        const date = timestamp ? new Date(timestamp / 1e6) : new Date();
        
        setRecentPurchases([{
          id: Date.now(),
          token: lastOrder[2],
          amount: Number(lastOrder[0].amount_e8s) / 1e8,
          date: date.toLocaleDateString(),
          status: 'completed'
        }]);
      }
    } catch (err) {
      console.error('Failed to fetch user data:', err);
    }
  }, [fetchBalance]);

  useEffect(() => {
    const initService = async () => {
      try {
        await launchBobService.init();
        const isAuth = launchBobService.isAuthenticated();
        setIsConnected(isAuth);
        if (isAuth) {
          await fetchUserData();
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    initService();
  }, [fetchUserData]);

  useEffect(() => {
    if (isConnected) {
      const intervalId = setInterval(fetchBalance, 1000);
      return () => clearInterval(intervalId);
    }
  }, [isConnected, fetchBalance]);

  const connectWallet = async () => {
    try {
      await launchBobService.login();
      setIsConnected(true);
      await fetchUserData();
    } catch (err) {
      console.error('Failed to connect wallet:', err);
    }
  };

  const setupAutoBuy = async () => {
    if (!autoBuyAmount || isNaN(autoBuyAmount) || Number(autoBuyAmount) <= 0) {
      return;
    }

    const amount = Number(autoBuyAmount);
    const newAutoBuy = {
      id: Date.now(),
      amount,
      status: 'active',
      createdAt: new Date().toLocaleDateString()
    };

    // Register callback for this auto-buy
    const callback = async (tokenId) => {
      try {
        const amountE8s = BigInt(Math.floor(amount * 1e8));
        const result = await launchBobService.buyToken(tokenId, amountE8s);

        if ('Ok' in result) {
          const tokenInfo = await launchBobService.getTokenInfo(tokenId);
          if (tokenInfo) {
            setRecentPurchases((prev) => [
              {
                id: Date.now(),
                token: tokenInfo.ticker,
                amount,
                date: new Date().toLocaleDateString(),
                status: 'completed',
              },
              ...prev,
            ]);
          }
          await fetchBalance();
        } else {
          console.error(`Auto-buy failed for token ${tokenId}: ${result.Err}`);
        }
      } catch (err) {
        console.error('Auto-buy execution failed:', err);
      }
    };

    const callbackId = launchBobService.registerCallback(callback);
    setAutoBuyCallbacks((prev) => new Map(prev).set(newAutoBuy.id, callbackId));
    setActiveAutoBuys((prev) => [...prev, newAutoBuy]);
    setAutoBuyAmount('');
  };

  const cancelAutoBuy = (autoBuyId) => {
    const callbackId = autoBuyCallbacks.get(autoBuyId);
    if (callbackId) {
      launchBobService.unregisterCallback(callbackId);
      setAutoBuyCallbacks((prev) => {
        const newCallbacks = new Map(prev);
        newCallbacks.delete(autoBuyId);
        return newCallbacks;
      });
    }
    setActiveAutoBuys((buys) => buys.filter((b) => b.id !== autoBuyId));
  };

  useEffect(() => {
    return () => {
      autoBuyCallbacks.forEach((callbackId) => {
        launchBobService.unregisterCallback(callbackId);
      });
    };
  }, [autoBuyCallbacks]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        </div>
      );
    }

    switch (selectedTab) {
      case 'tokens':
        return selectedToken ? (
          <TokenTrading
            token={selectedToken.tokenInfo}
            liquidityPool={selectedToken.liquidityPool}
            launchBobService={launchBobService}
            onBack={() => setSelectedToken(null)}
          />
        ) : (
          <TokenList
            onSelectToken={(tokenInfo, liquidityPool) => setSelectedToken({ tokenInfo, liquidityPool })}
            launchBobService={launchBobService}
          />
        );
      case 'autoBuy':
        return (
          <>
            <div className="bg-gray-900 border border-purple-900/30 rounded-lg p-6 mb-8">
              <h2 className="text-xl text-purple-400 mb-2">Setup Auto Buy</h2>
              <p className="text-gray-400 mb-4">
                Configure automatic token purchases for new launches
              </p>
              <div className="flex gap-4">
                <input
                  type="number"
                  value={autoBuyAmount}
                  onChange={(e) => setAutoBuyAmount(e.target.value)}
                  placeholder="Enter ICP amount"
                  className="flex-1 bg-gray-800 border border-purple-900/30 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
                <button
                  onClick={setupAutoBuy}
                  disabled={!autoBuyAmount || isNaN(autoBuyAmount) || Number(autoBuyAmount) <= 0}
                  className={`bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-all duration-200 ease-in-out transform hover:scale-105 flex items-center ${
                    !autoBuyAmount || isNaN(autoBuyAmount) || Number(autoBuyAmount) <= 0
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Setup Auto Buy
                </button>
              </div>
            </div>

            <div className="bg-gray-900 border border-purple-900/30 rounded-lg p-6">
              {activeAutoBuys.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  No active auto-buys
                </div>
              ) : (
                <div className="space-y-4">
                  {activeAutoBuys.map((autoBuy) => (
                    <div
                      key={autoBuy.id}
                      className="flex items-center justify-between bg-gray-800 p-4 rounded-lg border border-purple-900/30"
                    >
                      <div>
                        <p className="text-sm text-gray-400">Amount:</p>
                        <p className="text-lg text-purple-400">{autoBuy.amount} ICP</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Created:</p>
                        <p className="text-purple-400">{autoBuy.createdAt}</p>
                      </div>
                      <button
                        onClick={() => cancelAutoBuy(autoBuy.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        );
      case 'purchases':
        return (
          <div className="bg-gray-900 border border-purple-900/30 rounded-lg p-6">
            {recentPurchases.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No purchases made yet
              </div>
            ) : (
              <div className="space-y-4">
                {recentPurchases.map((purchase) => (
                  <div
                    key={purchase.id}
                    className="flex items-center justify-between bg-gray-800 p-4 rounded-lg border border-purple-900/30"
                  >
                    <div>
                      <p className="text-sm text-gray-400">Token:</p>
                      <p className="text-lg text-purple-400">{purchase.token}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Amount:</p>
                      <p className="text-purple-400">{purchase.amount} ICP</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Status:</p>
                      <p className={`${
                        purchase.status === 'completed' ? 'text-green-400' : 'text-yellow-400'
                      }`}>
                        {purchase.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'createToken':
        return <TokenCreation launchBobService={launchBobService} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <header className="border-b border-purple-900/30 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
            spongebob.fun
          </h1>
          
          {isConnected ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-purple-900/20 rounded-lg px-4 py-2">
                <Wallet className="w-4 h-4 mr-2 text-purple-400" />
                <span className="mr-2">Balance:</span>
                {showBalance ? (
                  <span className="text-purple-400">{icpBalance} ICP</span>
                ) : (
                  <span className="text-purple-400">••••••</span>
                )}
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className="ml-2 text-purple-400 hover:text-purple-300"
                >
                  {showBalance ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <Settings className="w-6 h-6 text-purple-400 cursor-pointer hover:text-purple-300" />
            </div>
          ) : (
            <button
              onClick={connectWallet}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-all duration-200 ease-in-out transform hover:scale-105"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      <main className="container mx-auto p-6">
        {isConnected ? (
          <>
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setSelectedTab('tokens')}
                className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center ${
                  selectedTab === 'tokens'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <Coins className="w-4 h-4 mr-2" />
                Tokens
              </button>
              <button
                onClick={() => setSelectedTab('autoBuy')}
                className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center ${
                  selectedTab === 'autoBuy'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <Bell className="w-4 h-4 mr-2" />
                Auto Buy
              </button>
              <button
                onClick={() => setSelectedTab('purchases')}
                className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                  selectedTab === 'purchases'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Recent Purchases
              </button>
              <button
                onClick={() => setSelectedTab('createToken')}
                className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center ${
                  selectedTab === 'createToken'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Create Token
              </button>
            </div>

            {renderContent()}
          </>
        ) : (
          <div className="bg-purple-900/20 border border-purple-900/30 rounded-lg p-6">
            <h2 className="text-xl text-purple-400 mb-2">Welcome to spongebob.fun!</h2>
            <p className="text-gray-400">
              Connect your Internet Identity wallet to start trading.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
