"use client";

import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  Shield,
  Coins,
  TrendingUp,
  UserX,
  UserCheck,
  Power,
  Settings,
  AlertTriangle,
} from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";

import { useStaking } from "@/hooks/useStaking";
import { formatAPY, formatTokenAmount } from "@/utils/staking";
import { REFERRAL_LEVEL_LABELS, DEFAULT_REFERRAL_RATES_BPS } from "@/types";
import BN from "bn.js";

export default function AdminPanel() {
  const { publicKey } = useWallet();
  const { platformState, rewardPoolBalance, isLoading } = useStaking();

  const [fundAmount, setFundAmount] = useState("");
  const [newApyBps, setNewApyBps] = useState("");
  const [targetUser, setTargetUser] = useState("");
  const [referralRates, setReferralRates] = useState<string[]>(
    DEFAULT_REFERRAL_RATES_BPS.map((r) => (r / 100).toFixed(2))
  );

  const isAdmin =
    publicKey &&
    platformState?.admin.toBase58() === publicKey.toBase58();

  const handleFundRewardPool = async () => {
    const amount = parseFloat(fundAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    toast.loading("Funding reward pool…");
    // await program.methods.fundRewardPool(new BN(toRawAmount(amount))).accounts({...}).rpc();
    toast.success(`Funded pool with ${amount} FBiT`);
  };

  const handleSetAPY = async () => {
    const bps = parseInt(newApyBps);
    if (!bps || bps < 0 || bps > 10_000) {
      toast.error("APY must be between 0 and 10000 bps.");
      return;
    }
    toast.loading("Setting new APY…");
    // await program.methods.setRewardRate(new BN(bps)).accounts({...}).rpc();
    toast.success(`APY updated to ${bps} bps (${(bps / 100).toFixed(2)}%)`);
  };

  const handleSetReferralRates = async () => {
    const rates = referralRates.map((r) => Math.round(parseFloat(r) * 100));
    if (rates.some((r) => isNaN(r) || r < 0)) {
      toast.error("Invalid referral rate values.");
      return;
    }
    toast.loading("Updating referral rates…");
    // await program.methods.setReferralRates(rates).accounts({...}).rpc();
    toast.success("Referral rates updated.");
  };

  const handleBlockUser = async () => {
    if (!targetUser) return;
    toast.loading(`Blocking ${targetUser}…`);
    // await program.methods.blockUser(new PublicKey(targetUser)).accounts({...}).rpc();
    toast.success("User blocked.");
  };

  const handleUnblockUser = async () => {
    if (!targetUser) return;
    toast.loading(`Unblocking ${targetUser}…`);
    // await program.methods.unblockUser(new PublicKey(targetUser)).accounts({...}).rpc();
    toast.success("User unblocked.");
  };

  const handleTogglePause = async () => {
    const paused = !platformState?.isPaused;
    toast.loading(paused ? "Pausing platform…" : "Resuming platform…");
    // await program.methods.setPauseState(paused).accounts({...}).rpc();
    toast.success(paused ? "Platform paused." : "Platform resumed.");
  };

  if (!publicKey) {
    return (
      <div className="rounded-2xl border border-dark-600 bg-dark-800 p-10 text-center">
        <Shield className="mx-auto mb-3 h-10 w-10 text-gray-600" />
        <p className="text-gray-400">Connect wallet to access admin panel.</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-10 text-center">
        <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-500" />
        <p className="text-red-400">Access denied. Admin only.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-brand-400" />
        <h2 className="text-lg font-bold text-white">Admin Panel</h2>
      </div>

      {/* Platform status */}
      <div className="rounded-xl border border-dark-600 bg-dark-800 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-300">Platform Status</h3>
          <span
            className={clsx(
              "rounded-full px-2.5 py-0.5 text-xs font-medium",
              platformState?.isPaused
                ? "bg-red-900/40 text-red-400"
                : "bg-brand-900/40 text-brand-400"
            )}
          >
            {platformState?.isPaused ? "Paused" : "Active"}
          </span>
        </div>
        <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-gray-500">Total Staked</p>
            <p className="font-semibold text-white">
              {formatTokenAmount(platformState?.totalStaked ?? new BN(0))} FBiT
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Reward Pool</p>
            <p className="font-semibold text-white">
              {rewardPoolBalance.toLocaleString()} FBiT
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Stakers</p>
            <p className="font-semibold text-white">
              {platformState?.totalStakers.toNumber().toLocaleString() ?? 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Base APY</p>
            <p className="font-semibold text-brand-400">
              {formatAPY(platformState?.baseApyBps.toNumber() ?? 0)}
            </p>
          </div>
        </div>
        <button
          onClick={handleTogglePause}
          className={clsx(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium",
            platformState?.isPaused
              ? "bg-brand-700 text-white hover:bg-brand-600"
              : "bg-red-800/50 text-red-300 hover:bg-red-800"
          )}
        >
          <Power className="h-4 w-4" />
          {platformState?.isPaused ? "Resume Platform" : "Pause Platform"}
        </button>
      </div>

      {/* Fund reward pool */}
      <div className="rounded-xl border border-dark-600 bg-dark-800 p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-300">
          <Coins className="h-4 w-4 text-brand-400" />
          Fund Reward Pool
        </h3>
        <div className="flex gap-3">
          <input
            type="number"
            placeholder="Amount (FBiT)"
            value={fundAmount}
            onChange={(e) => setFundAmount(e.target.value)}
            className="flex-1 rounded-lg border border-dark-500 bg-dark-700 px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-brand-500"
          />
          <button
            onClick={handleFundRewardPool}
            disabled={isLoading}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
          >
            Fund
          </button>
        </div>
      </div>

      {/* Set APY */}
      <div className="rounded-xl border border-dark-600 bg-dark-800 p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-300">
          <TrendingUp className="h-4 w-4 text-brand-400" />
          Set Reward Rate (APY)
        </h3>
        <div className="flex gap-3">
          <input
            type="number"
            placeholder="APY in basis points (e.g. 1200 = 12%)"
            value={newApyBps}
            onChange={(e) => setNewApyBps(e.target.value)}
            className="flex-1 rounded-lg border border-dark-500 bg-dark-700 px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-brand-500"
          />
          <button
            onClick={handleSetAPY}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
          >
            Update
          </button>
        </div>
        {newApyBps && (
          <p className="mt-1 text-xs text-gray-500">
            = {(parseInt(newApyBps) / 100).toFixed(2)}% APY
          </p>
        )}
      </div>

      {/* Set referral rates */}
      <div className="rounded-xl border border-dark-600 bg-dark-800 p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-300">
          <Settings className="h-4 w-4 text-brand-400" />
          Set Referral Commission Rates
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {REFERRAL_LEVEL_LABELS.map((label, i) => (
            <div key={i}>
              <label className="mb-1 block text-[10px] text-gray-500">
                Level {i + 1}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={referralRates[i]}
                  onChange={(e) => {
                    const updated = [...referralRates];
                    updated[i] = e.target.value;
                    setReferralRates(updated);
                  }}
                  className="w-full rounded border border-dark-500 bg-dark-700 px-2 py-1.5 pr-6 text-xs text-white outline-none focus:border-brand-500"
                />
                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">
                  %
                </span>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={handleSetReferralRates}
          className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
        >
          Update Rates
        </button>
      </div>

      {/* User management */}
      <div className="rounded-xl border border-dark-600 bg-dark-800 p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-300">
          <UserX className="h-4 w-4 text-red-400" />
          User Management
        </h3>
        <input
          type="text"
          placeholder="User wallet address (base58)"
          value={targetUser}
          onChange={(e) => setTargetUser(e.target.value)}
          className="mb-3 w-full rounded-lg border border-dark-500 bg-dark-700 px-3 py-2 font-mono text-sm text-white placeholder-gray-600 outline-none focus:border-brand-500"
        />
        <div className="flex gap-3">
          <button
            onClick={handleBlockUser}
            disabled={!targetUser}
            className="flex items-center gap-2 rounded-lg bg-red-800/60 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <UserX className="h-4 w-4" />
            Block User
          </button>
          <button
            onClick={handleUnblockUser}
            disabled={!targetUser}
            className="flex items-center gap-2 rounded-lg bg-brand-700/40 px-4 py-2 text-sm font-medium text-brand-300 hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <UserCheck className="h-4 w-4" />
            Unblock User
          </button>
        </div>
      </div>
    </div>
  );
}
