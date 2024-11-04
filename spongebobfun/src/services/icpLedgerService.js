import { Actor, HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { getAccountIdentifier } from './utils';

const ICP_LEDGER_CANISTER_ID = 'ryjl3-tyaaa-aaaaa-aaaba-cai';

const idlFactory = ({ IDL }) => {
  const AccountBalanceArgs = IDL.Record({ account: IDL.Vec(IDL.Nat8) });
  const Tokens = IDL.Record({ e8s: IDL.Nat64 });
  const Account = IDL.Record({ owner: IDL.Principal, subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)) });
  const ApproveArgs = IDL.Record({
    fee: IDL.Opt(IDL.Nat),
    memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
    from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
    created_at_time: IDL.Opt(IDL.Nat64),
    amount: IDL.Nat,
    expected_allowance: IDL.Opt(IDL.Nat),
    expires_at: IDL.Opt(IDL.Nat64),
    spender: Account,
  });
  const ApproveResult = IDL.Variant({
    Ok: IDL.Nat,
    Err: IDL.Record({ message: IDL.Text, error_code: IDL.Nat })
  });

  return IDL.Service({
    account_balance: IDL.Func([AccountBalanceArgs], [Tokens], ['query']),
    icrc2_approve: IDL.Func([ApproveArgs], [ApproveResult], [])
  });
};

class ICPLedgerService {
  constructor() {
    this.actor = null;
  }

  async init(identity) {
    const agent = new HttpAgent({ identity, host: "https://ic0.app" });

    if (process.env.NODE_ENV !== "production") {
      try {
        await agent.fetchRootKey();
      } catch (err) {
        console.warn("Unable to fetch root key. This is expected in local dev environment.", err);
      }
    }

    this.actor = Actor.createActor(idlFactory, {
      agent,
      canisterId: ICP_LEDGER_CANISTER_ID,
    });
  }

  async getBalance(identity) {
    try {
      if (!this.actor) await this.init(identity);

      const principal = identity.getPrincipal();
      const accountIdentifier = getAccountIdentifier(principal);
      const result = await this.actor.account_balance({ account: accountIdentifier });
      
      return result.e8s;
    } catch (err) {
      console.error('Error fetching ICP balance:', err);
      throw err;
    }
  }

  async approveSpender(identity, spenderAccount, amount) {
    try {
      if (!this.actor) await this.init(identity);

      const principal = identity.getPrincipal();

      // Prevent self-approval
      if (principal.toText() === spenderAccount.toText()) {
        throw new Error("Self-approval is not allowed");
      }

      const approveArgs = {
        fee: [10_000n], // 0.0001 ICP as BigInt in e8s
        memo: [],
        from_subaccount: null,
        created_at_time: null,
        amount,
        expected_allowance: null,
        expires_at: null,
        spender: { owner: spenderAccount, subaccount: null }
      };

      const result = await this.actor.icrc2_approve(approveArgs);
      if ("Err" in result) {
        console.error("Approve failed:", result.Err);
        throw new Error(result.Err.message);
      }

      return result.Ok;
    } catch (err) {
      console.error("Error approving spender:", err);
      throw err;
    }
  }
}

export const icpLedgerService = new ICPLedgerService();
