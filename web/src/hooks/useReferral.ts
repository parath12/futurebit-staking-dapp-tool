"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  buildReferralLink,
  extractReferrerFromUrl,
  copyToClipboard,
} from "@/utils/staking";
import { REFERRAL_BASE_URL } from "@/utils/constants";
import toast from "react-hot-toast";

export interface ReferralState {
  referralLink: string;
  referrerFromUrl: string | null;
  copiedLink: boolean;
  copyLink: () => Promise<void>;
  referralStats: {
    totalReferrals: number;
    totalEarned: number;
    pendingRewards: number;
    levels: { level: number; count: number; earned: number }[];
  };
}

export function useReferral(): ReferralState {
  const { publicKey } = useWallet();

  const [referralLink, setReferralLink] = useState("");
  const [referrerFromUrl, setReferrerFromUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Referral stats — populated from on-chain data in production
  const [referralStats] = useState({
    totalReferrals: 0,
    totalEarned: 0,
    pendingRewards: 0,
    levels: Array.from({ length: 10 }, (_, i) => ({
      level: i + 1,
      count: 0,
      earned: 0,
    })),
  });

  useEffect(() => {
    if (publicKey) {
      setReferralLink(buildReferralLink(REFERRAL_BASE_URL, publicKey.toBase58()));
    } else {
      setReferralLink("");
    }
  }, [publicKey]);

  useEffect(() => {
    const ref = extractReferrerFromUrl();
    if (ref) {
      setReferrerFromUrl(ref);
      // Persist referrer in sessionStorage so it survives wallet connection
      sessionStorage.setItem("fbit_referrer", ref);
    } else {
      const stored = sessionStorage.getItem("fbit_referrer");
      if (stored) setReferrerFromUrl(stored);
    }
  }, []);

  const copyLink = async () => {
    if (!referralLink) {
      toast.error("Connect wallet to get your referral link.");
      return;
    }
    const ok = await copyToClipboard(referralLink);
    if (ok) {
      setCopiedLink(true);
      toast.success("Referral link copied!");
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  return {
    referralLink,
    referrerFromUrl,
    copiedLink,
    copyLink,
    referralStats,
  };
}
