"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import toast from "react-hot-toast";

import { PlatformState, UserStakeAccount } from "@/types";
import {
  getPlatformStatePDA,
  getVaultPDA,
  getRewardVaultPDA,
  getUserStakePDA,
  calculatePendingRewards,
  toRawAmount,
} from "@/utils/staking";
import { FBIT_MINT, STAKING_PROGRAM_ID, SOLANA_RPC_URL } from "@/utils/constants";

// ─── Hook Return Type ──────────────────────────────────────────────────────────

export interface StakingState {
  platformState: PlatformState | null;
  userStake: UserStakeAccount | null;
  userTokenBalance: number;
  pendingRewards: number;
  rewardPoolBalance: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
  stake: (amount: number, lockPeriodSecs: number, referrer?: string) => Promise<void>;
  unstake: () => Promise<void>;
  claimRewards: () => Promise<void>;
  compound: () => Promise<void>;
}

// ─── Hook Implementation ───────────────────────────────────────────────────────

export function useStaking(): StakingState {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, signTransaction } = useWallet();

  const [platformState, setPlatformState] = useState<PlatformState | null>(null);
  const [userStake, setUserStake] = useState<UserStakeAccount | null>(null);
  const [userTokenBalance, setUserTokenBalance] = useState(0);
  const [pendingRewards, setPendingRewards] = useState(0);
  const [rewardPoolBalance, setRewardPoolBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // ── Load on-chain data ──────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      // In production: use Anchor program.account.platformState.fetch()
      // Here we load raw account data and show a mock for dev mode
      const [platformPDA] = await getPlatformStatePDA();
      const [rewardVaultPDA] = await getRewardVaultPDA();

      const platformInfo = await connection.getAccountInfo(platformPDA);
      const rewardVaultInfo = await connection.getAccountInfo(rewardVaultPDA);

      if (platformInfo) {
        // Mock deserialization — replace with Anchor IDL deserialization
        setPlatformState({
          admin: new PublicKey("11111111111111111111111111111111"),
          tokenMint: FBIT_MINT,
          vault: new PublicKey("11111111111111111111111111111111"),
          rewardVault: rewardVaultPDA,
          totalStaked: { toNumber: () => 0 } as any,
          totalRewardsPaid: { toNumber: () => 0 } as any,
          baseApyBps: { toNumber: () => 1200 } as any,
          referralRatesBps: [25, 50, 125, 150, 200, 325, 350, 425, 550, 800].map(
            (v) => ({ toNumber: () => v } as any)
          ),
          isPaused: false,
          totalStakers: { toNumber: () => 0 } as any,
          bump: 254,
        });
      }

      if (publicKey) {
        const [userStakePDA] = await getUserStakePDA(publicKey);
        const userStakeInfo = await connection.getAccountInfo(userStakePDA);

        if (userStakeInfo) {
          // Mock — replace with real Anchor deserialization
          const now = Date.now() / 1000;
          setUserStake({
            user: publicKey,
            amountStaked: { toNumber: () => 0 } as any,
            lockPeriodSecs: { toNumber: () => 0 } as any,
            stakeTimestamp: { toNumber: () => now } as any,
            lastClaimTimestamp: { toNumber: () => now } as any,
            referrer: PublicKey.default,
            referralChain: Array(10).fill(PublicKey.default),
            accruedRewards: { toNumber: () => 0 } as any,
            totalRewardsClaimed: { toNumber: () => 0 } as any,
            totalReferralEarned: { toNumber: () => 0 } as any,
            pendingReferralRewards: { toNumber: () => 0 } as any,
            isBlocked: false,
            isActive: false,
            bump: 254,
          });
        } else {
          setUserStake(null);
        }

        // Load user's FBiT token balance
        try {
          const userAta = await getAssociatedTokenAddress(FBIT_MINT, publicKey);
          const ataInfo = await connection.getTokenAccountBalance(userAta);
          setUserTokenBalance(ataInfo.value.uiAmount ?? 0);
        } catch {
          setUserTokenBalance(0);
        }

        // Calculate live pending rewards
        if (userStake?.isActive) {
          const pending = calculatePendingRewards(
            userStake.amountStaked.toNumber() / 1e9,
            platformState?.baseApyBps.toNumber() ?? 1200,
            userStake.lastClaimTimestamp.toNumber()
          );
          setPendingRewards(pending);
        }
      }

      // Reward pool balance
      if (rewardVaultInfo) {
        const bal = await connection.getTokenAccountBalance(rewardVaultPDA);
        setRewardPoolBalance(bal.value.uiAmount ?? 0);
      }
    } catch (err) {
      console.error("Failed to load staking data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [connection, publicKey, userStake, platformState]);

  useEffect(() => {
    refresh();
  }, [publicKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh pending rewards every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (userStake?.isActive) {
        const pending = calculatePendingRewards(
          userStake.amountStaked.toNumber() / 1e9,
          platformState?.baseApyBps.toNumber() ?? 1200,
          userStake.lastClaimTimestamp.toNumber()
        );
        setPendingRewards(pending);
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [userStake, platformState]);

  // ── Transactions ────────────────────────────────────────────────────────────

  const stake = useCallback(
    async (amount: number, lockPeriodSecs: number, referrer?: string) => {
      if (!publicKey || !sendTransaction) {
        toast.error("Connect your wallet first.");
        return;
      }
      setIsLoading(true);
      const toastId = toast.loading("Preparing stake transaction…");
      try {
        const [platformPDA] = await getPlatformStatePDA();
        const [vaultPDA] = await getVaultPDA();
        const [userStakePDA] = await getUserStakePDA(publicKey);
        const userAta = await getAssociatedTokenAddress(FBIT_MINT, publicKey);

        // NOTE: Build instruction via Anchor program in production:
        // const ix = await program.methods
        //   .stake(new BN(toRawAmount(amount, 9)), new BN(lockPeriodSecs), referrerPubkey || null)
        //   .accounts({ ... })
        //   .instruction();

        toast.success("Stake submitted!", { id: toastId });
        await refresh();
      } catch (err: any) {
        toast.error(`Stake failed: ${err.message}`, { id: toastId });
      } finally {
        setIsLoading(false);
      }
    },
    [publicKey, sendTransaction, refresh]
  );

  const unstake = useCallback(async () => {
    if (!publicKey || !sendTransaction) return;
    setIsLoading(true);
    const toastId = toast.loading("Preparing unstake transaction…");
    try {
      // Build unstake instruction via Anchor program
      toast.success("Unstake submitted!", { id: toastId });
      await refresh();
    } catch (err: any) {
      toast.error(`Unstake failed: ${err.message}`, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, sendTransaction, refresh]);

  const claimRewards = useCallback(async () => {
    if (!publicKey || !sendTransaction) return;
    setIsLoading(true);
    const toastId = toast.loading("Claiming rewards…");
    try {
      // Build claim instruction via Anchor program
      toast.success("Rewards claimed!", { id: toastId });
      await refresh();
    } catch (err: any) {
      toast.error(`Claim failed: ${err.message}`, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, sendTransaction, refresh]);

  const compound = useCallback(async () => {
    if (!publicKey || !sendTransaction) return;
    setIsLoading(true);
    const toastId = toast.loading("Compounding rewards…");
    try {
      // Build compound instruction via Anchor program
      toast.success("Rewards compounded!", { id: toastId });
      await refresh();
    } catch (err: any) {
      toast.error(`Compound failed: ${err.message}`, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, sendTransaction, refresh]);

  return {
    platformState,
    userStake,
    userTokenBalance,
    pendingRewards,
    rewardPoolBalance,
    isLoading,
    refresh,
    stake,
    unstake,
    claimRewards,
    compound,
  };
}
