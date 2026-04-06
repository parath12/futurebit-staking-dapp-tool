"use client";

import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Lock, TrendingUp, Clock, Info } from "lucide-react";
import clsx from "clsx";

import { useStaking } from "@/hooks/useStaking";
import { useReferral } from "@/hooks/useReferral";
import { LOCK_OPTIONS, LockOption } from "@/types";
import {
  formatAPY,
  formatDuration,
  calculateEffectiveAPY,
} from "@/utils/staking";

export default function StakeForm() {
  const { publicKey } = useWallet();
  const { platformState, userStake, userTokenBalance, isLoading, stake } =
    useStaking();
  const { referrerFromUrl } = useReferral();

  const [amount, setAmount] = useState("");
  const [selectedLock, setSelectedLock] = useState<LockOption>(LOCK_OPTIONS[1]);
  const [customReferrer, setCustomReferrer] = useState(
    referrerFromUrl || ""
  );

  useEffect(() => {
    if (referrerFromUrl) setCustomReferrer(referrerFromUrl);
  }, [referrerFromUrl]);

  const baseApyBps = platformState?.baseApyBps.toNumber() ?? 1200;
  const effectiveAPY = calculateEffectiveAPY(baseApyBps, selectedLock.apyBonus);

  const estimatedDailyReward =
    parseFloat(amount || "0") * (effectiveAPY / 100) * (1 / 365);

  const handleStake = async () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) return;
    await stake(parsedAmount, selectedLock.seconds, customReferrer || undefined);
  };

  const isDisabled =
    isLoading ||
    !publicKey ||
    userStake?.isActive ||
    !amount ||
    parseFloat(amount) <= 0 ||
    parseFloat(amount) > userTokenBalance;

  return (
    <div className="rounded-2xl border border-dark-600 bg-dark-800 p-6">
      <h2 className="mb-6 text-lg font-bold text-white">Stake FBiT Tokens</h2>

      {/* Active stake warning */}
      {userStake?.isActive && (
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-400" />
          <p className="text-sm text-yellow-300">
            You have an active stake. Unstake first before creating a new
            position.
          </p>
        </div>
      )}

      {/* Platform paused */}
      {platformState?.isPaused && (
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
          <p className="text-sm text-red-300">
            Platform is currently paused by admin.
          </p>
        </div>
      )}

      {/* Amount input */}
      <div className="mb-5">
        <label className="mb-1.5 block text-sm font-medium text-gray-400">
          Amount to Stake
        </label>
        <div className="relative">
          <input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-dark-500 bg-dark-700 px-4 py-3 pr-24 text-white placeholder-gray-600 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
          <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
            <span className="text-sm font-medium text-gray-400">FBiT</span>
            <button
              onClick={() => setAmount(userTokenBalance.toString())}
              className="rounded bg-brand-700/50 px-2 py-0.5 text-xs font-medium text-brand-300 hover:bg-brand-700"
            >
              MAX
            </button>
          </div>
        </div>
        <p className="mt-1 text-right text-xs text-gray-500">
          Balance: <span className="text-gray-300">{userTokenBalance.toLocaleString()} FBiT</span>
        </p>
      </div>

      {/* Lock period selector */}
      <div className="mb-5">
        <label className="mb-2 block text-sm font-medium text-gray-400">
          Lock Period
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {LOCK_OPTIONS.map((option) => (
            <button
              key={option.seconds}
              onClick={() => setSelectedLock(option)}
              className={clsx(
                "rounded-lg border px-3 py-2.5 text-center text-sm transition-all",
                selectedLock.seconds === option.seconds
                  ? "border-brand-500 bg-brand-600/20 text-brand-300"
                  : "border-dark-500 bg-dark-700 text-gray-400 hover:border-brand-700 hover:text-gray-200"
              )}
            >
              <div className="font-semibold">{option.label}</div>
              {option.apyBonus > 0 && (
                <div className="mt-0.5 text-[10px] text-brand-400">
                  +{(option.apyBonus * 100).toFixed(0)}% bonus
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Referral input */}
      <div className="mb-5">
        <label className="mb-1.5 block text-sm font-medium text-gray-400">
          Referral Code{" "}
          <span className="text-xs text-gray-600">(optional)</span>
        </label>
        <input
          type="text"
          placeholder="Referrer wallet address"
          value={customReferrer}
          onChange={(e) => setCustomReferrer(e.target.value)}
          className="w-full rounded-lg border border-dark-500 bg-dark-700 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
        {referrerFromUrl && (
          <p className="mt-1 text-xs text-brand-400">
            Referral link detected automatically.
          </p>
        )}
      </div>

      {/* Reward estimate */}
      {parseFloat(amount) > 0 && (
        <div className="mb-5 rounded-lg border border-brand-800/40 bg-brand-900/20 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-400">
            Estimated Rewards
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-gray-500">Effective APY</p>
              <p className="text-lg font-bold text-brand-400">
                {effectiveAPY.toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Daily Reward</p>
              <p className="text-lg font-bold text-white">
                {estimatedDailyReward.toFixed(4)}{" "}
                <span className="text-sm text-gray-400">FBiT</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Lock Period</p>
              <p className="text-lg font-bold text-white">
                {selectedLock.label}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Lock icon + info */}
      <div className="mb-5 flex items-center gap-2 text-xs text-gray-500">
        <Lock className="h-3.5 w-3.5" />
        <span>
          Tokens are locked until the end of your chosen period. Early
          withdrawal is not permitted.
        </span>
      </div>

      {/* CTA */}
      {!publicKey ? (
        <WalletMultiButton className="!w-full !rounded-lg !bg-brand-600 !py-3 !text-base !font-semibold hover:!bg-brand-500" />
      ) : (
        <button
          onClick={handleStake}
          disabled={isDisabled}
          className={clsx(
            "w-full rounded-lg py-3 text-base font-semibold transition-all",
            isDisabled
              ? "cursor-not-allowed bg-dark-600 text-gray-500"
              : "bg-brand-600 text-white hover:bg-brand-500"
          )}
        >
          {isLoading ? "Processing…" : "Stake FBiT"}
        </button>
      )}
    </div>
  );
}
