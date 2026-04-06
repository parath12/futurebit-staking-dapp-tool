import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import SolanaWalletProvider from "@/components/WalletProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "FutureBit Staking | Earn FBiT Rewards on Solana",
  description:
    "Stake FBiT tokens on Solana and earn rewards through our secure staking platform with a 10-level referral program.",
  keywords: ["Solana", "staking", "FBiT", "FutureBit", "DeFi", "referral"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <SolanaWalletProvider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#182019",
                color: "#e2e8f0",
                border: "1px solid #1e2b20",
                borderRadius: "10px",
                fontSize: "14px",
              },
              success: {
                iconTheme: { primary: "#25a270", secondary: "#fff" },
              },
              error: {
                iconTheme: { primary: "#ef4444", secondary: "#fff" },
              },
            }}
          />
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
