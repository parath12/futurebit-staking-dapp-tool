use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::errors::StakingError;
use crate::state::{PlatformState, UserStakeAccount};

#[derive(Accounts)]
pub struct Unstake<'info> {
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

    /// Platform vault (source of staked tokens)
    #[account(
        mut,
        seeds = [b"vault"],
        bump,
        token::mint = platform_state.token_mint,
        token::authority = platform_state,
    )]
    pub vault: Account<'info, TokenAccount>,

    /// Reward vault (source of reward tokens)
    #[account(
        mut,
        seeds = [b"reward_vault"],
        bump,
        token::mint = platform_state.token_mint,
        token::authority = platform_state,
    )]
    pub reward_vault: Account<'info, TokenAccount>,

    /// User's token account (destination)
    #[account(
        mut,
        token::mint = platform_state.token_mint,
        token::authority = user,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<Unstake>) -> Result<()> {
    let platform_state = &mut ctx.accounts.platform_state;
    let user_stake = &mut ctx.accounts.user_stake_account;

    require!(!platform_state.is_paused, StakingError::PlatformPaused);
    require!(!user_stake.is_blocked, StakingError::UserBlocked);
    require!(user_stake.is_active, StakingError::NoActiveStake);

    let current_time = Clock::get()?.unix_timestamp;

    // Enforce lock period
    require!(
        user_stake.is_unlocked(current_time),
        StakingError::TokensStillLocked
    );

    let principal = user_stake.amount_staked;

    // Calculate any remaining unclaimed rewards
    let pending_rewards = user_stake
        .calculate_pending_rewards(current_time, platform_state.base_apy_bps);
    let total_rewards = pending_rewards
        .checked_add(user_stake.accrued_rewards)
        .ok_or(StakingError::ArithmeticOverflow)?
        .checked_add(user_stake.pending_referral_rewards)
        .ok_or(StakingError::ArithmeticOverflow)?;

    let seeds = &[b"platform_state".as_ref(), &[platform_state.bump]];
    let signer_seeds = &[&seeds[..]];

    // Return principal from vault to user
    let transfer_principal = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: platform_state.to_account_info(),
        },
        signer_seeds,
    );
    token::transfer(transfer_principal, principal)?;

    // Pay out any remaining rewards from reward vault if available
    if total_rewards > 0 && ctx.accounts.reward_vault.amount >= total_rewards {
        let transfer_rewards = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.reward_vault.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: platform_state.to_account_info(),
            },
            signer_seeds,
        );
        token::transfer(transfer_rewards, total_rewards)?;

        platform_state.total_rewards_paid = platform_state
            .total_rewards_paid
            .saturating_add(total_rewards);
        user_stake.total_rewards_claimed = user_stake
            .total_rewards_claimed
            .saturating_add(total_rewards);
    }

    // Update platform state
    platform_state.total_staked = platform_state.total_staked.saturating_sub(principal);
    platform_state.total_stakers = platform_state.total_stakers.saturating_sub(1);

    // Reset user stake (keep history)
    user_stake.amount_staked = 0;
    user_stake.is_active = false;
    user_stake.accrued_rewards = 0;
    user_stake.pending_referral_rewards = 0;

    msg!(
        "User {} unstaked {} tokens + {} rewards.",
        ctx.accounts.user.key(),
        principal,
        total_rewards
    );

    Ok(())
}
