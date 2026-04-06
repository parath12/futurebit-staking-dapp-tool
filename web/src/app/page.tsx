"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import StakeForm from "@/components/StakeForm";
import Dashboard from "@/components/Dashboard";
import ReferralPanel from "@/components/ReferralPanel";
import AdminPanel from "@/components/AdminPanel";
import { TabId } from "@/types";
import {
  Coins,
  TrendingUp,
  Shield,
  Users,
  Zap,
  Lock,
} from "lucide-react";

const FEATURES = [
  {
    icon: <Coins className="h-5 w-5 text-brand-400" />,
    title: "Flexible Lock Periods",
    desc: "Choose from 15 days up to 10 years with higher APY for longer commitments.",
  },
  {
    icon: <TrendingUp className="h-5 w-5 text-brand-400" />,
    title: "Auto-Compounding",
    desc: "Compound your accrued rewards back into principal to maximize returns.",
  },
  {
    icon: <Users className="h-5 w-5 text-brand-400" />,
    title: "10-Level Referrals",
    desc: "Earn commissions from up to 10 levels deep in your referral network.",
  },
  {
    icon: <Lock className="h-5 w-5 text-brand-400" />,
    title: "Non-Custodial",
    desc: "Your tokens are secured on-chain via audited Anchor smart contracts.",
  },
  {
    icon: <Zap className="h-5 w-5 text-brand-400" />,
    title: "Daily Claims",
    desc: "Claim your staking rewards every 24 hours directly to your wallet.",
  },
  {
    icon: <Shield className="h-5 w-5 text-brand-400" />,
    title: "Admin Safeguards",
    desc: "Admin controls for reward pool management and user protection.",
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("stake");

  const renderTab = () => {
    switch (activeTab) {
      case "stake":
        return <StakeForm />;
      case "dashboard":
        return <Dashboard />;
      case "referral":
        return <ReferralPanel />;
      case "admin":
        return <AdminPanel />;
      default:
        return <StakeForm />;
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar activeTab={activeTab} onTabChange={(t) => setActiveTab(t as TabId)} />

      <main className="mx-auto max-w-7xl px-4 py-10">
        {/* Hero — only visible on stake tab */}
        {activeTab === "stake" && (
          <section className="mb-10 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-700/40 bg-brand-900/20 px-4 py-1.5">
              <Zap className="h-3.5 w-3.5 text-brand-400" />
              <span className="text-xs font-medium text-brand-300">
                Powered by Solana
              </span>
            </div>
            <h1 className="mb-3 text-3xl font-extrabold text-white sm:text-4xl">
              Stake{" "}
              <span className="bg-gradient-to-r from-brand-400 to-brand-300 bg-clip-text text-transparent">
                FBiT Tokens
              </span>
              , Earn Rewards
            </h1>
            <p className="mx-auto max-w-xl text-base text-gray-400">
              Lock your FBiT tokens, earn daily staking rewards, and grow your
              passive income through our 10-level referral commission network.
            </p>
          </section>
        )}

        {/* Main content */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Tab content */}
          <div className="lg:col-span-2">{renderTab()}</div>

          {/* Side panel */}
          <aside className="space-y-5">
            {/* Feature list */}
            <div className="rounded-2xl border border-dark-600 bg-dark-800 p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
                Platform Features
              </h3>
              <ul className="space-y-4">
                {FEATURES.map((f) => (
                  <li key={f.title} className="flex gap-3">
                    <div className="mt-0.5 flex-shrink-0">{f.icon}</div>
                    <div>
                      <p className="text-sm font-medium text-white">{f.title}</p>
                      <p className="text-xs text-gray-500">{f.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Lock period summary */}
            <div className="rounded-2xl border border-dark-600 bg-dark-800 p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
                Lock Period APY Bonus
              </h3>
              <div className="space-y-1.5">
                {[
                  ["15 Days",  "Base APY"],
                  ["30 Days",  "+5% bonus"],
                  ["90 Days",  "+15% bonus"],
                  ["180 Days", "+30% bonus"],
                  ["365 Days", "+50% bonus"],
                  ["2 Years",  "+100% bonus"],
                  ["5 Years",  "+250% bonus"],
                  ["10 Years", "+500% bonus"],
                ].map(([period, bonus]) => (
                  <div
                    key={period}
                    className="flex justify-between rounded-lg px-3 py-1.5 text-sm odd:bg-dark-700/50"
                  >
                    <span className="text-gray-300">{period}</span>
                    <span className="font-medium text-brand-400">{bonus}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>

      <footer className="mt-20 border-t border-dark-700 py-8 text-center text-xs text-gray-600">
        <p>
          © {new Date().getFullYear()} FutureBit Staking Platform · Built on
          Solana ·{" "}
          <span className="text-gray-500">
            Not financial advice. Stake responsibly.
          </span>
        </p>
      </footer>
    </div>
  );
}
