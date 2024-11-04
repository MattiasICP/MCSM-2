import { Actor, HttpAgent } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
import { idlFactory } from "../declarations/launchbob.did";
import { icpLedgerService } from "./icpLedgerService";

const LAUNCH_BOB_CANISTER_ID = 'h7uwa-hyaaa-aaaam-qbgvq-cai';
const II_URL = "https://identity.ic0.app";

class LaunchBobService {
  constructor() {
    this.actor = null;
    this.authClient = null;
    this.identity = null;
    this.tokenInfoCache = new Map();
    this.monitoringCallbacks = new Map();
    this.lastKnownTokenId = null;
  }

  async init() {
    this.authClient = await AuthClient.create();
    if (await this.authClient.isAuthenticated()) {
      this.identity = await this.authClient.getIdentity();
      await this.initActor();
      await this.initializeTokenMonitoring();
    }
  }

  async initActor() {
    const agent = new HttpAgent({
      identity: this.identity,
      host: "https://ic0.app"
    });

    if (process.env.NODE_ENV !== "production") {
      try {
        await agent.fetchRootKey();
      } catch (err) {
        console.warn("Unable to fetch root key. This is expected in local dev environment.", err);
      }
    }

    this.actor = Actor.createActor(idlFactory, {
      agent,
      canisterId: LAUNCH_BOB_CANISTER_ID,
    });

    // Initialize ICP ledger service
    await icpLedgerService.init(this.identity);
  }

  async login() {
    return new Promise((resolve, reject) => {
      this.authClient.login({
        identityProvider: II_URL,
        onSuccess: async () => {
          this.identity = await this.authClient.getIdentity();
          await this.initActor();
          await this.initializeTokenMonitoring();
          resolve();
        },
        onError: reject
      });
    });
  }

  async logout() {
    await this.authClient.logout();
    this.identity = null;
    this.actor = null;
    this.tokenInfoCache.clear();
    this.monitoringCallbacks.clear();
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  async initializeTokenMonitoring() {
    try {
      const metadata = await this.getMetadata();
      this.lastKnownTokenId = Number(metadata.next_token_id);
      
      if (!this.monitoringInterval) {
        this.monitoringInterval = setInterval(async () => {
          try {
            await this.checkNewTokens();
          } catch (err) {
            console.error('Error checking for new tokens:', err);
          }
        }, 5000); // Check every 5 seconds
      }
    } catch (err) {
      console.error('Error initializing token monitoring:', err);
    }
  }

  async checkNewTokens() {
    if (!this.lastKnownTokenId) return;

    try {
      const metadata = await this.getMetadata();
      const currentTokenId = Number(metadata.next_token_id);

      if (currentTokenId > this.lastKnownTokenId) {
        // New tokens detected
        for (let id = this.lastKnownTokenId; id < currentTokenId; id++) {
          const tokenId = BigInt(id);
          // Execute all registered callbacks for this new token
          for (const [callbackId, callback] of this.monitoringCallbacks) {
            try {
              await callback(tokenId);
            } catch (err) {
              console.error(`Error executing callback ${callbackId} for token ${id}:`, err);
            }
          }
        }
        this.lastKnownTokenId = currentTokenId;
      }
    } catch (err) {
      console.error('Error checking for new tokens:', err);
    }
  }

  registerCallback(callback) {
    const callbackId = Date.now().toString();
    this.monitoringCallbacks.set(callbackId, callback);
    return callbackId;
  }

  unregisterCallback(callbackId) {
    this.monitoringCallbacks.delete(callbackId);
  }

  async getICPBalance() {
    return await icpLedgerService.getBalance(this.identity);
  }

  async getMetadata() {
    return await this.actor.get_metadata();
  }

  async getTokens(orderBy, limit) {
    try {
      const tokens = await this.actor.get_tokens(orderBy, limit);
      await Promise.all(tokens.map(async ([tokenInfo]) => {
        if (tokenInfo?.token_id && !this.tokenInfoCache.has(tokenInfo.token_id)) {
          try {
            const info = await this.getTokenInfo(BigInt(tokenInfo.token_id));
            if (info) {
              this.tokenInfoCache.set(tokenInfo.token_id, info);
            }
          } catch (err) {
            console.warn(`Failed to fetch token info for ${tokenInfo.token_id}:`, err);
          }
        }
      }));
      return tokens;
    } catch (err) {
      console.error('Error fetching tokens:', err);
      throw err;
    }
  }

  async getTokenInfo(tokenId) {
    try {
      if (!tokenId) {
        throw new Error('Token ID is required');
      }

      if (this.tokenInfoCache.has(tokenId)) {
        return this.tokenInfoCache.get(tokenId);
      }

      const info = await this.actor.get_token_info(BigInt(tokenId));
      if (info && info.length > 0) {
        this.tokenInfoCache.set(tokenId, info[0]);
        return info[0];
      }
      return null;
    } catch (err) {
      console.error('Error fetching token info:', err);
      throw err;
    }
  }

  async getTokenData(tokenId) {
    try {
      if (!tokenId) {
        throw new Error('Token ID is required');
      }
      
      const bigIntTokenId = BigInt(tokenId);
      const data = await this.actor.get_token_data(bigIntTokenId);
      
      if (!this.tokenInfoCache.has(tokenId)) {
        try {
          const info = await this.getTokenInfo(bigIntTokenId);
          if (info) {
            this.tokenInfoCache.set(tokenId, info);
          }
        } catch (err) {
          console.warn('Failed to fetch token info:', err);
        }
      }
      
      return data;
    } catch (err) {
      console.error('Error fetching token data:', err);
      throw err;
    }
  }

  async buyToken(tokenId, amountE8s) {
    try {
      if (!tokenId) throw new Error('Token ID is required');
      const bigIntTokenId = BigInt(tokenId);
      const bigIntAmount = BigInt(amountE8s);
      
      return await this.actor.buy_from(bigIntTokenId, bigIntAmount);
    } catch (err) {
      console.error('Error buying token:', err);
      throw err;
    }
  }

  async sellToken(tokenId, amountE8s) {
    try {
      if (!tokenId) throw new Error('Token ID is required');
      const bigIntTokenId = BigInt(tokenId);
      const bigIntAmount = BigInt(amountE8s);
      
      return await this.actor.sell_from(bigIntTokenId, bigIntAmount);
    } catch (err) {
      console.error('Error selling token:', err);
      throw err;
    }
  }

  async getTokenBalance(tokenId, principal) {
    try {
      const balance = await this.actor.get_token_balance(BigInt(tokenId), principal);
      return balance;
    } catch (err) {
      console.error('Error fetching token balance:', err);
      throw err;
    }
  }

  async getTokenBalances() {
    try {
      const principal = this.identity.getPrincipal();
      return await this.actor.get_token_balances(principal);
    } catch (err) {
      console.error('Error fetching token balances:', err);
      throw err;
    }
  }

  async getLastOrder() {
    try {
      return await this.actor.get_last_order();
    } catch (err) {
      console.error('Error fetching last order:', err);
      throw err;
    }
  }

  async getPendingTransfers() {
    try {
      return await this.actor.get_pending_transfers();
    } catch (err) {
      console.error('Error fetching pending transfers:', err);
      throw err;
    }
  }

  async createToken(createTokenArg) {
    try {
      return await this.actor.create_token(createTokenArg);
    } catch (err) {
      console.error('Error creating token:', err);
      throw err;
    }
  }

  isAuthenticated() {
    return !!this.identity;
  }

  getPrincipal() {
    return this.identity?.getPrincipal();
  }

  getCachedTokenInfo(tokenId) {
    return this.tokenInfoCache.get(tokenId);
  }
}

export const launchBobService = new LaunchBobService();