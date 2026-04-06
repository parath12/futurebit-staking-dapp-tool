use anchor_lang::prelude::*;

use crate::errors::StakingError;
use crate::state::{PlatformState, UserStakeAccount};

#[derive(Accounts)]
pub struct Compound<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"platform_state"],
        bump = platform_state.bump,
    )]
    pub platform_state: Account<'info, PlatformState>,

    #[account(
        mut,
        seeds = [b"user_stake", user.key().as_ref()],
        bump = user_stake_account.bump,
        constraint = user_stake_account.user == user.key(),
    )]
    pub user_stake_account: Account<'info, UserStakeAccount>,
}

/// Compound: add accrued rewards back into the principal stake amount.
/// This increases the staked amount for future reward calculations,
/// effectively implementing auto-compounding (APY vs APR).
pub fn handler(ctx: Context<Compound>) -> Result<()> {
    let platform_state = &mut ctx.accounts.platform_state;
    let user_stake = &mut ctx.accounts.user_stake_account;

    require!(!platform_state.is_paused, StakingError::PlatformPaused);
    require!(!user_stake.is_blocked, StakingError::UserBlocked);
    require!(user_stake.is_active, StakingError::NoActiveStake);

    let current_time = Clock::get()?.unix_timestamp;

    // Enforce 24-hour cooldown on compound as well
    require!(
        user_stake.can_claim(current_time),
        StakingError::ClaimCooldown
    );

    // Calculate pending rewards to compound
    let pending = user_stake
        .calculate_pending_rewards(current_time, platform_state.base_apy_bps);

    let total_to_compound = pending
        .checked_add(user_stake.accrued_rewards)
        .ok_or(StakingError::ArithmeticOverflow)?;

    require!(total_to_compound > 0, StakingError::NoRewardsToClaim);

    // Add rewards to principal (no token transfer — stays in vault)
    let new_staked = user_stake
        .amount_staked
        .checked_add(total_to_compound)
        .ok_or(StakingError::ArithmeticOverflow)?;

    // Update platform total staked
    let delta = new_staked.saturating_sub(user_stake.amount_staked);
    platform_state.total_staked = platform_state
        .total_staked
        .checked_add(delta)
        .ok_or(StakingError::ArithmeticOverflow)?;

    // Update user stake
    user_stake.amount_staked = new_staked;
    user_stake.accrued_rewards = 0;
    user_stake.last_claim_timestamp = current_time;

    msg!(
        "User {} compounded {} tokens. New stake: {}",
        ctx.accounts.user.key(),
        total_to_compound,
        new_staked
    );

    Ok(())
}
