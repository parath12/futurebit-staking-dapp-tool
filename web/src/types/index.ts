import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

// ─── On-chain account shapes ───────────────────────────────────────────────────

export interface PlatformState {
  admin: PublicKey;
  tokenMint: PublicKey;
  vault: PublicKey;
  rewardVault: PublicKey;
  totalStaked: BN;
  totalRewardsPaid: BN;
  baseApyBps: BN;
  referralRatesBps: BN[];
  isPaused: boolean;
  totalStakers: BN;
  bump: number;
}

export interface UserStakeAccount {
  user: PublicKey;
  amountStaked: BN;
  lockPeriodSecs: BN;
  stakeTimestamp: BN;
  lastClaimTimestamp: BN;
  referrer: PublicKey;
  referralChain: PublicKey[];
  accruedRewards: BN;
  totalRewardsClaimed: BN;
  totalReferralEarned: BN;
  pendingReferralRewards: BN;
  isBlocked: boolean;
  isActive: boolean;
  bump: number;
}

// ─── UI Types ──────────────────────────────────────────────────────────────────

export interface LockOption {
  label: string;
  seconds: number;
  apyBonus: number; // additional APY multiplier for longer locks
}

export const LOCK_OPTIONS: LockOption[] = [
  { label: "15 Days",  seconds: 15  * 24 * 3600, apyBonus: 0 },
  { label: "30 Days",  seconds: 30  * 24 * 3600, apyBonus: 0.05 },
  { label: "90 Days",  seconds: 90  * 24 * 3600, apyBonus: 0.15 },
  { label: "180 Days", seconds: 180 * 24 * 3600, apyBonus: 0.30 },
  { label: "365 Days", seconds: 365 * 24 * 3600, apyBonus: 0.50 },
  { label: "2 Years",  seconds: 2   * 365 * 24 * 3600, apyBonus: 1.0 },
  { label: "5 Years",  seconds: 5   * 365 * 24 * 3600, apyBonus: 2.5 },
  { label: "10 Years", seconds: 10  * 365 * 24 * 3600, apyBonus: 5.0 },
];

export const REFERRAL_LEVEL_LABELS: string[] = [
  "Level 1 (0.25%)",
  "Level 2 (0.50%)",
  "Level 3 (1.25%)",
  "Level 4 (1.50%)",
  "Level 5 (2.00%)",
  "Level 6 (3.25%)",
  "Level 7 (3.50%)",
  "Level 8 (4.25%)",
  "Level 9 (5.50%)",
  "Level 10 (8.00%)",
];

export const DEFAULT_REFERRAL_RATES_BPS = [25, 50, 125, 150, 200, 325, 350, 425, 550, 800];

export type TabId = "stake" | "dashboard" | "referral" | "admin";
