"use client";

import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  TrendingUp,
  Clock,
  Coins,
  RefreshCw,
  Unlock,
  ArrowDownCircle,
} from "lucide-react";
import clsx from "clsx";

import { useStaking } from "@/hooks/useStaking";
import {
  formatTokenAmount,
  formatDuration,
  daysUntilUnlock,
  getUnlockTimestamp,
} from "@/utils/staking";
import BN from "bn.js";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accent?: boolean;
}

function StatCard({ label, value, sub, icon, accent }: StatCardProps) {
  return (
    <div
      className={clsx(
        "rounded-xl border p-4",
        accent
          ? "border-brand-600/40 bg-brand-900/20"
          : "border-dark-600 bg-dark-800"
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        <div
          className={clsx(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            accent ? "bg-brand-700/40 text-brand-400" : "bg-dark-700 text-gray-400"
          )}
        >
          {icon}
        </div>
      </div>
      <p className={clsx("text-2xl font-bold", accent ? "text-brand-300" : "text-white")}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { publicKey } = useWallet();
  const {
    platformState,
    userStake,
    userTokenBalance,
    pendingRewards,
    isLoading,
    refresh,
    claimRewards,
    compound,
    unstake,
  } = useStaking();

  if (!publicKey) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dark-600 bg-dark-800 p-10 text-center">
        <Coins className="h-10 w-10 text-gray-600" />
        <p className="text-gray-400">Connect your wallet to view your dashboard.</p>
        <WalletMultiButton className="!rounded-lg !bg-brand-600 !font-medium hover:!bg-brand-500" />
      </div>
    );
  }

  const isActive = userStake?.isActive ?? false;
  const stakedAmount = userStake?.amountStaked.toNumber() ?? 0;
  const lockPeriod = userStake?.lockPeriodSecs.toNumber() ?? 0;
  const stakeTs = userStake?.stakeTimestamp.toNumber() ?? 0;
  const lastClaimTs = userStake?.lastClaimTimestamp.toNumber() ?? 0;
  const totalClaimed = userStake?.totalRewardsClaimed.toNumber() ?? 0;
  const referralEarned = userStake?.totalReferralEarned.toNumber() ?? 0;

  const daysLeft = isActive ? daysUntilUnlock(stakeTs, lockPeriod) : 0;
  const unlockDate = isActive ? getUnlockTimestamp(stakeTs, lockPeriod) : null;
  const canUnstake = isActive && daysLeft === 0;

  const canClaim =
    isActive &&
    Date.now() / 1000 >= lastClaimTs + 24 * 3600;

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Your Dashboard</h2>
        <button
          onClick={refresh}
          disabled={isLoading}
          className="flex items-center gap-1.5 rounded-lg border border-dark-500 bg-dark-700 px-3 py-1.5 text-sm text-gray-400 hover:text-white"
        >
          <RefreshCw className={clsx("h-3.5 w-3.5", isLoading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Staked Balance"
          value={`${formatTokenAmount(new BN(stakedAmount))} FBiT`}
          icon={<Coins className="h-4 w-4" />}
          accent={isActive}
        />
        <StatCard
          label="Pending Rewards"
          value={`${pendingRewards.toFixed(6)} FBiT`}
          sub="Updates every 30s"
          icon={<TrendingUp className="h-4 w-4" />}
          accent
        />
        <StatCard
          label="Wallet Balance"
          value={`${userTokenBalance.toLocaleString()} FBiT`}
          icon={<Coins className="h-4 w-4" />}
        />
        <StatCard
          label="Total Claimed"
          value={`${formatTokenAmount(new BN(totalClaimed))} FBiT`}
          sub={`+ ${formatTokenAmount(new BN(referralEarned))} referral`}
          icon={<ArrowDownCircle className="h-4 w-4" />}
        />
      </div>

      {/* Stake position detail */}
      {isActive ? (
        <div className="rounded-xl border border-dark-600 bg-dark-800 p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-300">
            Active Stake Position
          </h3>
          <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-gray-500">Lock Period</p>
              <p className="mt-0.5 font-semibold text-white">
                {formatDuration(lockPeriod)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Unlock Date</p>
              <p className="mt-0.5 font-semibold text-white">
                {unlockDate?.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Days Remaining</p>
              <p
                className={clsx(
                  "mt-0.5 font-semibold",
                  canUnstake ? "text-brand-400" : "text-yellow-400"
                )}
              >
                {canUnstake ? "Unlocked!" : `${daysLeft} days`}
              </p>
            </div>
          </div>

          {/* Lock progress bar */}
          {!canUnstake && (
            <div className="mb-4">
              <div className="h-2 w-full rounded-full bg-dark-600">
                <div
                  className="h-2 rounded-full bg-brand-500 transition-all"
                  style={{
                    width: `${Math.max(
                      2,
                      ((lockPeriod - daysLeft * 86400) / lockPeriod) * 100
                    )}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-right text-[10px] text-gray-600">
                {(
                  ((lockPeriod - daysLeft * 86400) / lockPeriod) * 100
                ).toFixed(1)}
                % elapsed
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={claimRewards}
              disabled={!canClaim || isLoading}
              className={clsx(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                canClaim && !isLoading
                  ? "bg-brand-600 text-white hover:bg-brand-500"
                  : "cursor-not-allowed bg-dark-600 text-gray-500"
              )}
            >
              <ArrowDownCircle className="h-4 w-4" />
              Claim Rewards
            </button>

            <button
              onClick={compound}
              disabled={!canClaim || isLoading}
              className={clsx(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                canClaim && !isLoading
                  ? "border border-brand-600 text-brand-400 hover:bg-brand-700/20"
                  : "cursor-not-allowed border border-dark-500 text-gray-500"
              )}
            >
              <RefreshCw className="h-4 w-4" />
              Compound
            </button>

            <button
              onClick={unstake}
              disabled={!canUnstake || isLoading}
              className={clsx(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                canUnstake && !isLoading
                  ? "border border-red-600/60 text-red-400 hover:bg-red-900/20"
                  : "cursor-not-allowed border border-dark-500 text-gray-500"
              )}
            >
              <Unlock className="h-4 w-4" />
              Unstake
            </button>
          </div>

          {!canClaim && isActive && (
            <p className="mt-3 text-xs text-gray-600">
              <Clock className="mr-1 inline h-3 w-3" />
              Claim available every 24 hours.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-dark-500 p-8 text-center">
          <Coins className="mx-auto mb-3 h-8 w-8 text-gray-600" />
          <p className="text-gray-500">
            No active stake. Go to the <strong className="text-gray-300">Stake</strong> tab to start earning.
          </p>
        </div>
      )}

      {/* Platform stats */}
      {platformState && (
        <div className="rounded-xl border border-dark-600 bg-dark-800 p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-300">
            Platform Overview
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-gray-500">Total Staked</p>
              <p className="mt-0.5 font-semibold text-white">
                {formatTokenAmount(platformState.totalStaked)} FBiT
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Stakers</p>
              <p className="mt-0.5 font-semibold text-white">
                {platformState.totalStakers.toNumber().toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Rewards Distributed</p>
              <p className="mt-0.5 font-semibold text-white">
                {formatTokenAmount(platformState.totalRewardsPaid)} FBiT
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
