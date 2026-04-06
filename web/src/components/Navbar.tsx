"use client";

import React from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Activity, Zap } from "lucide-react";
import { useStaking } from "@/hooks/useStaking";
import { formatAPY } from "@/utils/staking";
import clsx from "clsx";

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const NAV_ITEMS = [
  { id: "stake",     label: "Stake" },
  { id: "dashboard", label: "Dashboard" },
  { id: "referral",  label: "Referrals" },
  { id: "admin",     label: "Admin" },
];

export default function Navbar({ activeTab, onTabChange }: NavbarProps) {
  const { publicKey } = useWallet();
  const { platformState } = useStaking();

  return (
    <header className="sticky top-0 z-50 border-b border-brand-800/40 bg-dark-900/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="block text-base font-bold leading-none text-white">
              FutureBit
            </span>
            <span className="block text-[10px] font-medium uppercase tracking-widest text-brand-400">
              Staking
            </span>
          </div>
        </Link>

        {/* Platform APY badge */}
        {platformState && (
          <div className="hidden items-center gap-1.5 rounded-full border border-brand-700/40 bg-brand-900/30 px-3 py-1 md:flex">
            <Activity className="h-3.5 w-3.5 text-brand-400" />
            <span className="text-xs text-brand-300">
              Base APY:{" "}
              <strong className="text-brand-400">
                {formatAPY(platformState.baseApyBps.toNumber())}
              </strong>
            </span>
          </div>
        )}

        {/* Nav links */}
        <nav className="hidden gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={clsx(
                "rounded-lg px-4 py-1.5 text-sm font-medium transition-all",
                activeTab === item.id
                  ? "bg-brand-600 text-white"
                  : "text-gray-400 hover:bg-dark-600 hover:text-white"
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Wallet connect button */}
        <WalletMultiButton className="!h-9 !rounded-lg !bg-brand-600 !text-sm !font-medium hover:!bg-brand-500" />
      </div>

      {/* Mobile nav */}
      <div className="flex gap-1 overflow-x-auto border-t border-dark-600 px-4 py-2 md:hidden">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={clsx(
              "flex-shrink-0 rounded-lg px-4 py-1.5 text-xs font-medium transition-all",
              activeTab === item.id
                ? "bg-brand-600 text-white"
                : "text-gray-400"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </header>
  );
}
