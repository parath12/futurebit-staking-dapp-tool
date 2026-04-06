# FutureBit Staking DApp

A full-stack Solana staking platform for FBiT tokens with a 10-level referral system, built with Rust/Anchor and Next.js/TypeScript.

---

## Architecture

```
futurebit-staking-dapp-tool/
├── anchor/                          # Solana smart contract (Rust + Anchor)
│   ├── Anchor.toml
│   ├── Cargo.toml
│   └── programs/staking/src/
│       ├── lib.rs                   # Program entry point & instruction routing
│       ├── state.rs                 # On-chain account structs (PlatformState, UserStakeAccount)
│       ├── errors.rs                # Custom error codes
│       └── instructions/
│           ├── initialize.rs        # Platform setup
│           ├── stake.rs             # Stake tokens (with optional referral)
│           ├── unstake.rs           # Unstake after lock period
│           ├── claim_rewards.rs     # Daily reward claim (24h cooldown)
│           ├── compound.rs          # Compound rewards into principal
│           └── admin.rs             # Admin: fund pool, set rates, block/unblock, pause
└── web/                             # Next.js 14 frontend
    └── src/
        ├── app/                     # Next.js App Router pages
        ├── components/
        │   ├── WalletProvider.tsx   # Phantom + Solflare wallet adapter
        │   ├── Navbar.tsx           # Navigation + wallet connect button
        │   ├── StakeForm.tsx        # Stake UI with lock period selector
        │   ├── Dashboard.tsx        # Live rewards, lock progress, claim/compound/unstake
        │   ├── ReferralPanel.tsx    # Referral link, 10-level commission table
        │   └── AdminPanel.tsx       # Admin: fund pool, set APY, manage users
        ├── hooks/
        │   ├── useStaking.ts        # On-chain data loading + transaction builders
        │   └── useReferral.ts       # Referral link generation + URL extraction
        ├── utils/
        │   ├── constants.ts         # Program IDs, seeds, network config
        │   └── staking.ts           # PDA derivation, reward calc, formatting helpers
        ├── types/index.ts           # TypeScript types + lock options + referral levels
        └── idl/staking.ts           # Anchor IDL type definitions
```

---

## Smart Contract

### Accounts

| Account | PDA Seeds | Description |
|---|---|---|
| `PlatformState` | `["platform_state"]` | Global config: admin, mint, APY, referral rates, pause state |
| `UserStakeAccount` | `["user_stake", user_pubkey]` | Per-user: stake amount, lock period, referral chain, rewards |
| `vault` | `["vault"]` | SPL token account holding all staked FBiT |
| `reward_vault` | `["reward_vault"]` | SPL token account holding reward pool |

### Instructions

| Instruction | Caller | Description |
|---|---|---|
| `initialize` | Admin | Deploy platform with initial APY in basis points |
| `stake` | User | Stake FBiT with lock period + optional referrer |
| `unstake` | User | Reclaim principal + remaining rewards after lock expires |
| `claim_rewards` | User | Claim daily rewards (24h on-chain cooldown) |
| `compound` | User | Re-add accrued rewards to principal (no token transfer) |
| `fund_reward_pool` | Admin | Deposit tokens into the reward pool |
| `set_reward_rate` | Admin | Update base APY (basis points) |
| `set_referral_rates` | Admin | Update all 10 referral level rates |
| `block_user` | Admin | Prevent a user from all platform actions |
| `unblock_user` | Admin | Restore a user's access |
| `set_pause_state` | Admin | Pause or unpause the entire platform |
| `transfer_admin` | Admin | Transfer admin authority to new address |

### Lock Periods

| Period | Duration |
|---|---|
| 15 Days | 1,296,000 seconds |
| 30 Days | 2,592,000 seconds |
| 90 Days | 7,776,000 seconds |
| 180 Days | 15,552,000 seconds |
| 365 Days | 31,536,000 seconds |
| 2 Years | 63,072,000 seconds |
| 5 Years | 157,680,000 seconds |
| 10 Years | 315,360,000 seconds |

### Referral Commission Structure (10 Levels)

| Level | Rate |
|---|---|
| Level 1 (Direct) | 0.25% |
| Level 2 | 0.50% |
| Level 3 | 1.25% |
| Level 4 | 1.50% |
| Level 5 | 2.00% |
| Level 6 | 3.25% |
| Level 7 | 3.50% |
| Level 8 | 4.25% |
| Level 9 | 5.50% |
| Level 10 | 8.00% |

Commissions are distributed when a referred user claims rewards, propagated up the chain.

### Reward Formula

```
reward = amount_staked × apy_bps × elapsed_seconds
         ─────────────────────────────────────────
              seconds_per_year × 10_000
```

---

## Frontend

- **Wallet Support**: Phantom, Solflare (via `@solana/wallet-adapter`)
- **Framework**: Next.js 14 App Router + TypeScript
- **Styling**: Tailwind CSS with custom dark green brand theme
- **Blockchain**: `@coral-xyz/anchor` + `@solana/web3.js` + `@solana/spl-token`

### Pages / Tabs

| Tab | Description |
|---|---|
| **Stake** | Enter amount, choose lock period, optionally enter referral code |
| **Dashboard** | Live pending rewards, lock countdown, claim/compound/unstake |
| **Referrals** | Shareable referral link, 10-level commission table, earnings breakdown |
| **Admin** | Fund reward pool, set APY/referral rates, block/unblock users, pause platform |

---

## Development Setup

### Prerequisites

- Rust 1.75+
- Solana CLI 1.18+
- Anchor CLI 0.30+
- Node.js 18+

### 1. Deploy the Smart Contract

```bash
cd anchor

# Install dependencies
cargo build

# Generate a new program keypair
solana-keygen new -o target/deploy/staking-keypair.json

# Update declare_id! in src/lib.rs and programs.devnet in Anchor.toml
anchor keys sync

# Build
anchor build

# Deploy to Devnet
anchor deploy --provider.cluster devnet

# Note the deployed program ID and update web/src/utils/constants.ts
```

### 2. Configure the Frontend

```bash
cd web

# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Update `web/src/utils/constants.ts`:
```ts
export const STAKING_PROGRAM_ID = new PublicKey("YOUR_DEPLOYED_PROGRAM_ID");
export const FBIT_MINT = new PublicKey("YOUR_FBIT_TOKEN_MINT");
```

Copy the generated IDL:
```bash
cp anchor/target/idl/staking.json web/src/idl/staking.json
```

### 3. Run Frontend

```bash
cd web
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## Platform Initialization

After deploying, run the initialize instruction once:

```typescript
await program.methods
  .initialize(new BN(1200)) // 12% base APY
  .accounts({
    admin: wallet.publicKey,
    tokenMint: FBIT_MINT,
    platformState: platformStatePDA,
    vault: vaultPDA,
    rewardVault: rewardVaultPDA,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
    rent: SYSVAR_RENT_PUBKEY,
  })
  .rpc();
```

Fund the reward pool before users can claim:

```typescript
await program.methods
  .fundRewardPool(new BN(1_000_000 * 1e9)) // 1M FBiT
  .accounts({ ... })
  .rpc();
```

---

## Security Considerations

- All PDAs use canonical bumps verified on-chain
- Lock period enforcement is checked against `Clock::unix_timestamp`
- 24-hour claim cooldown prevents reward draining
- Self-referral is blocked at the instruction level
- Admin-only functions gated by public key comparison
- Arithmetic uses `checked_add`/`saturating_*` to prevent overflow
- Platform pause state disables all user actions instantly

---

## Technologies

| Layer | Tech |
|---|---|
| Smart Contract | Rust, Anchor Framework 0.30 |
| Token Standard | SPL Token (FBiT) |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Wallet | @solana/wallet-adapter (Phantom, Solflare) |
| Blockchain SDK | @solana/web3.js, @coral-xyz/anchor |
| Network | Solana Devnet → Mainnet |
