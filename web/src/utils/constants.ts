import { PublicKey } from "@solana/web3.js";

// ─── Program IDs ───────────────────────────────────────────────────────────────
// Replace with actual deployed program ID after `anchor deploy`
export const STAKING_PROGRAM_ID = new PublicKey(
  "StakXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
);

// Replace with actual FBIT token mint address
export const FBIT_MINT = new PublicKey(
  "FBiTXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
);

// ─── PDA Seeds ─────────────────────────────────────────────────────────────────
export const PLATFORM_STATE_SEED = Buffer.from("platform_state");
export const VAULT_SEED = Buffer.from("vault");
export const REWARD_VAULT_SEED = Buffer.from("reward_vault");
export const USER_STAKE_SEED = Buffer.from("user_stake");

// ─── Token Decimals ────────────────────────────────────────────────────────────
export const FBIT_DECIMALS = 9;
export const FBIT_UNIT = 10 ** FBIT_DECIMALS;

// ─── Network ───────────────────────────────────────────────────────────────────
export const SOLANA_NETWORK = "devnet";
export const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ||
  "https://api.devnet.solana.com";

// ─── Referral ─────────────────────────────────────────────────────────────────
export const REFERRAL_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://staking.futurebit.io";

// ─── Claim cooldown in ms ─────────────────────────────────────────────────────
export const CLAIM_COOLDOWN_MS = 24 * 60 * 60 * 1000;
