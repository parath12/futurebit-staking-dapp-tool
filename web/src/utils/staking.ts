import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import {
  STAKING_PROGRAM_ID,
  PLATFORM_STATE_SEED,
  VAULT_SEED,
  REWARD_VAULT_SEED,
  USER_STAKE_SEED,
  FBIT_UNIT,
} from "./constants";

// ─── PDA Derivation Helpers ────────────────────────────────────────────────────

export async function getPlatformStatePDA(): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddressSync(
    [PLATFORM_STATE_SEED],
    STAKING_PROGRAM_ID
  );
}

export async function getVaultPDA(): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddressSync(
    [VAULT_SEED],
    STAKING_PROGRAM_ID
  );
}

export async function getRewardVaultPDA(): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddressSync(
    [REWARD_VAULT_SEED],
    STAKING_PROGRAM_ID
  );
}

export async function getUserStakePDA(
  userPubkey: PublicKey
): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddressSync(
    [USER_STAKE_SEED, userPubkey.toBuffer()],
    STAKING_PROGRAM_ID
  );
}

// ─── Formatting Helpers ────────────────────────────────────────────────────────

export function formatTokenAmount(
  rawAmount: BN | number | bigint,
  decimals: number = 9
): string {
  const amount =
    typeof rawAmount === "bigint"
      ? Number(rawAmount)
      : typeof rawAmount === "number"
      ? rawAmount
      : rawAmount.toNumber();

  const divisor = 10 ** decimals;
  const formatted = (amount / divisor).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
  return formatted;
}

export function toRawAmount(humanAmount: number, decimals: number = 9): BN {
  return new BN(Math.floor(humanAmount * 10 ** decimals));
}

export function formatAPY(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

export function formatDuration(seconds: number): string {
  const YEAR = 365 * 24 * 3600;
  const DAY = 24 * 3600;

  if (seconds >= YEAR) {
    const years = seconds / YEAR;
    return years === 1 ? "1 Year" : `${years} Years`;
  }
  const days = seconds / DAY;
  return `${days} Days`;
}

// ─── Reward Calculation (mirrors on-chain logic) ───────────────────────────────

const SECONDS_PER_YEAR = 365 * 24 * 3600;
const BPS_DENOMINATOR = 10_000;

/**
 * Calculate estimated pending rewards for a stake position.
 * Mirrors the on-chain `calculate_pending_rewards` function.
 */
export function calculatePendingRewards(
  amountStaked: number,
  apyBps: number,
  lastClaimTimestamp: number,
  currentTimestamp: number = Date.now() / 1000
): number {
  const elapsed = Math.max(0, currentTimestamp - lastClaimTimestamp);
  if (elapsed === 0 || amountStaked === 0) return 0;

  return (amountStaked * apyBps * elapsed) / (SECONDS_PER_YEAR * BPS_DENOMINATOR);
}

/**
 * Calculate APY as a percentage, including lock-period bonus.
 */
export function calculateEffectiveAPY(
  baseApyBps: number,
  lockBonus: number = 0
): number {
  return (baseApyBps / 100) * (1 + lockBonus);
}

/**
 * Calculate unlock timestamp given stake timestamp and lock period.
 */
export function getUnlockTimestamp(
  stakeTimestamp: number,
  lockPeriodSecs: number
): Date {
  return new Date((stakeTimestamp + lockPeriodSecs) * 1000);
}

/**
 * Calculate days remaining until unlock.
 */
export function daysUntilUnlock(
  stakeTimestamp: number,
  lockPeriodSecs: number
): number {
  const unlockTs = stakeTimestamp + lockPeriodSecs;
  const nowSecs = Date.now() / 1000;
  const remaining = unlockTs - nowSecs;
  return Math.max(0, Math.ceil(remaining / (24 * 3600)));
}

// ─── Referral Helpers ──────────────────────────────────────────────────────────

export function buildReferralLink(
  baseUrl: string,
  walletAddress: string
): string {
  return `${baseUrl}?ref=${walletAddress}`;
}

export function extractReferrerFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return params.get("ref");
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Calculate referral commission for a given level.
 */
export function calcReferralCommission(
  rewardAmount: number,
  levelRateBps: number
): number {
  return (rewardAmount * levelRateBps) / BPS_DENOMINATOR;
}

// ─── Clipboard ────────────────────────────────────────────────────────────────

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
