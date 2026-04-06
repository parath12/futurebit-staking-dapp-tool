use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("StakXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");

#[program]
pub mod staking {
    use super::*;

    // ─── Platform Setup ────────────────────────────────────────────────────────

    /// Initialize the staking platform. Called once by the admin.
    pub fn initialize(ctx: Context<Initialize>, base_apy_bps: u64) -> Result<()> {
        initialize::handler(ctx, base_apy_bps)
    }

    // ─── User Actions ──────────────────────────────────────────────────────────

    /// Stake FBiT tokens with an optional referrer and lock period.
    /// Lock periods: 15d | 30d | 90d | 180d | 365d | 2y | 5y | 10y
    pub fn stake(
        ctx: Context<Stake>,
        amount: u64,
        lock_period_secs: u64,
        referrer: Option<Pubkey>,
    ) -> Result<()> {
        stake::handler(ctx, amount, lock_period_secs, referrer)
    }

    /// Unstake tokens after the lock period has elapsed.
    /// Also pays out any remaining accrued rewards.
    pub fn unstake(ctx: Context<Unstake>) -> Result<()> {
        unstake::handler(ctx)
    }

    /// Claim daily staking rewards (24-hour cooldown enforced on-chain).
    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        claim_rewards::handler(ctx)
    }

    /// Compound accrued rewards back into the principal stake.
    /// Increases future reward calculations without a token transfer.
    pub fn compound(ctx: Context<Compound>) -> Result<()> {
        compound::handler(ctx)
    }

    // ─── Admin Actions ─────────────────────────────────────────────────────────

    /// Fund the reward pool with tokens.
    pub fn fund_reward_pool(ctx: Context<FundRewardPool>, amount: u64) -> Result<()> {
        admin::fund_reward_pool(ctx, amount)
    }

    /// Update the base APY rate (in basis points).
    pub fn set_reward_rate(ctx: Context<SetRewardRate>, new_apy_bps: u64) -> Result<()> {
        admin::set_reward_rate(ctx, new_apy_bps)
    }

    /// Update all 10 referral level rates (in basis points each).
    pub fn set_referral_rates(
        ctx: Context<SetReferralRates>,
        new_rates_bps: [u64; 10],
    ) -> Result<()> {
        admin::set_referral_rates(ctx, new_rates_bps)
    }

    /// Block a user from all platform interactions.
    pub fn block_user(ctx: Context<ManageUser>, target_user: Pubkey) -> Result<()> {
        admin::block_user(ctx, target_user)
    }

    /// Unblock a previously blocked user.
    pub fn unblock_user(ctx: Context<ManageUser>, target_user: Pubkey) -> Result<()> {
        admin::unblock_user(ctx, target_user)
    }

    /// Pause or unpause the entire platform.
    pub fn set_pause_state(ctx: Context<SetPauseState>, paused: bool) -> Result<()> {
        admin::set_pause_state(ctx, paused)
    }

    /// Transfer admin authority to a new address.
    pub fn transfer_admin(ctx: Context<TransferAdmin>, new_admin: Pubkey) -> Result<()> {
        admin::transfer_admin(ctx, new_admin)
    }
}
