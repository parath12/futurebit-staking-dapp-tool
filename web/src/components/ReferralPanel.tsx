"use client";

import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  Copy,
  Check,
  Users,
  TrendingUp,
  Share2,
  ChevronRight,
} from "lucide-react";

import { useReferral } from "@/hooks/useReferral";
import { useStaking } from "@/hooks/useStaking";
import {
  REFERRAL_LEVEL_LABELS,
  DEFAULT_REFERRAL_RATES_BPS,
} from "@/types";
import { shortenAddress } from "@/utils/staking";

export default function ReferralPanel() {
  const { publicKey } = useWallet();
  const { referralLink, copiedLink, copyLink, referralStats } = useReferral();
  const { platformState } = useStaking();

  const referralRates = platformState?.referralRatesBps.map((r) =>
    r.toNumber()
  ) ?? DEFAULT_REFERRAL_RATES_BPS;

  if (!publicKey) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dark-600 bg-dark-800 p-10 text-center">
        <Share2 className="h-10 w-10 text-gray-600" />
        <p className="text-gray-400">
          Connect your wallet to get your referral link.
        </p>
        <WalletMultiButton className="!rounded-lg !bg-brand-600 !font-medium hover:!bg-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-white">Referral Program</h2>

      {/* Referral link card */}
      <div className="rounded-xl border border-brand-700/30 bg-brand-900/10 p-5">
        <p className="mb-1 text-sm font-medium text-gray-300">
          Your Referral Link
        </p>
        <p className="mb-3 text-xs text-gray-500">
          Share this link. Anyone who stakes using it will earn you commissions
          across up to 10 referral levels.
        </p>
        <div className="flex gap-2">
          <div className="flex-1 truncate rounded-lg border border-dark-500 bg-dark-700 px-3 py-2.5 font-mono text-xs text-gray-300">
            {referralLink || "Connect wallet to generate link"}
          </div>
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 rounded-lg border border-brand-600/50 bg-brand-700/30 px-3 py-2.5 text-sm text-brand-300 transition-all hover:bg-brand-700/50"
          >
            {copiedLink ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copiedLink ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-600">
          Your address: {shortenAddress(publicKey.toBase58(), 6)}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-dark-600 bg-dark-800 p-4 text-center">
          <Users className="mx-auto mb-2 h-5 w-5 text-gray-500" />
          <p className="text-2xl font-bold text-white">
            {referralStats.totalReferrals}
          </p>
          <p className="text-xs text-gray-500">Total Referrals</p>
        </div>
        <div className="rounded-xl border border-dark-600 bg-dark-800 p-4 text-center">
          <TrendingUp className="mx-auto mb-2 h-5 w-5 text-brand-400" />
          <p className="text-2xl font-bold text-brand-300">
            {referralStats.totalEarned.toFixed(4)}
          </p>
          <p className="text-xs text-gray-500">Total Earned (FBiT)</p>
        </div>
        <div className="rounded-xl border border-dark-600 bg-dark-800 p-4 text-center">
          <TrendingUp className="mx-auto mb-2 h-5 w-5 text-yellow-400" />
          <p className="text-2xl font-bold text-yellow-300">
            {referralStats.pendingRewards.toFixed(4)}
          </p>
          <p className="text-xs text-gray-500">Pending (FBiT)</p>
        </div>
      </div>

      {/* 10-level referral structure */}
      <div className="rounded-xl border border-dark-600 bg-dark-800 p-5">
        <h3 className="mb-4 text-sm font-semibold text-gray-300">
          10-Level Referral Commission Structure
        </h3>
        <div className="space-y-2">
          {REFERRAL_LEVEL_LABELS.map((label, index) => {
            const rateBps = referralRates[index] ?? DEFAULT_REFERRAL_RATES_BPS[index];
            const pct = (rateBps / 100).toFixed(2);
            const stats = referralStats.levels[index];

            return (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border border-dark-600 bg-dark-700 px-4 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-800/50 text-xs font-bold text-brand-400">
                    {index + 1}
                  </div>
                  <span className="text-sm text-gray-300">{label}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500">
                    {stats?.count ?? 0} users
                  </span>
                  <span className="font-mono text-sm font-semibold text-brand-400">
                    {pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-gray-600">
          Commissions are distributed on each reward claim of your referred
          network.
        </p>
      </div>

      {/* Level breakdown table */}
      <div className="rounded-xl border border-dark-600 bg-dark-800 p-5">
        <h3 className="mb-4 text-sm font-semibold text-gray-300">
          Your Level Earnings
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-600 text-xs text-gray-500">
                <th className="pb-2 text-left">Level</th>
                <th className="pb-2 text-right">Referrals</th>
                <th className="pb-2 text-right">Commission %</th>
                <th className="pb-2 text-right">Earned (FBiT)</th>
              </tr>
            </thead>
            <tbody>
              {referralStats.levels.map((lvl) => (
                <tr
                  key={lvl.level}
                  className="border-b border-dark-700/50 text-gray-300"
                >
                  <td className="py-2">Level {lvl.level}</td>
                  <td className="py-2 text-right">{lvl.count}</td>
                  <td className="py-2 text-right font-mono text-brand-400">
                    {((referralRates[lvl.level - 1] ?? 0) / 100).toFixed(2)}%
                  </td>
                  <td className="py-2 text-right">{lvl.earned.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
