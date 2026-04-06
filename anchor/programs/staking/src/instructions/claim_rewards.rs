use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::errors::StakingError;
use crate::state::{PlatformState, UserStakeAccount, BPS_DENOMINATOR};

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
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

    /// Reward vault (source of reward tokens)
    #[account(
        mut,
        seeds = [b"reward_vault"],
        bump,
        token::mint = platform_state.token_mint,
        token::authority = platform_state,
    )]
    pub reward_vault: Account<'info, TokenAccount>,

    /// User's token account (destination for rewards)
    #[account(
        mut,
        token::mint = platform_state.token_mint,
        token::authority = user,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ClaimRewards>) -> Result<()> {
    let platform_state = &mut ctx.accounts.platform_state;
    let user_stake = &mut ctx.accounts.user_stake_account;

    require!(!platform_state.is_paused, StakingError::PlatformPaused);
    require!(!user_stake.is_blocked, StakingError::UserBlocked);
    require!(user_stake.is_active, StakingError::NoActiveStake);

    let current_time = Clock::get()?.unix_timestamp;

    // Enforce 24-hour claim cooldown
    require!(
        user_stake.can_claim(current_time),
        StakingError::ClaimCooldown
    );

    // Calculate pending staking rewards since last claim
    let pending = user_stake
        .calculate_pending_rewards(current_time, platform_state.base_apy_bps);

    let total_claimable = pending
        .checked_add(user_stake.accrued_rewards)
        .ok_or(StakingError::ArithmeticOverflow)?
        .checked_add(user_stake.pending_referral_rewards)
        .ok_or(StakingError::ArithmeticOverflow)?;

    require!(total_claimable > 0, StakingError::NoRewardsToClaim);
    require!(
        ctx.accounts.reward_vault.amount >= total_claimable,
        StakingError::InsufficientRewardPool
    );

    // Transfer rewards from reward vault to user
    let seeds = &[b"platform_state".as_ref(), &[platform_state.bump]];
    let signer_seeds = &[&seeds[..]];

    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.reward_vault.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: platform_state.to_account_info(),
        },
        signer_seeds,
    );
    token::transfer(transfer_ctx, total_claimable)?;

    // Distribute referral commissions from this claim
    distribute_referral_commissions(
        platform_state,
        user_stake,
        pending,
    )?;

    // Update state
    user_stake.last_claim_timestamp = current_time;
    user_stake.accrued_rewards = 0;
    user_stake.pending_referral_rewards = 0;
    user_stake.total_rewards_claimed = user_stake
        .total_rewards_claimed
        .saturating_add(total_claimable);

    platform_state.total_rewards_paid = platform_state
        .total_rewards_paid
        .saturating_add(total_claimable);

    msg!(
        "User {} claimed {} tokens in rewards.",
        ctx.accounts.user.key(),
        total_claimable
    );

    Ok(())
}

/// Calculates referral commissions for each level in the referral chain.
/// The commissions are stored on each referrer's UserStakeAccount as
/// `pending_referral_rewards` — they are paid out when the referrer claims.
/// NOTE: In a full on-chain implementation each referrer account must be
/// passed as a remaining account. Here we emit events so the frontend can
/// track them; actual on-chain distribution should pass referrer accounts.
fn distribute_referral_commissions(
    platform_state: &PlatformState,
    user_stake: &mut UserStakeAccount,
    reward_amount: u64,
) -> Result<()> {
    for (level, &referrer_key) in user_stake.referral_chain.iter().enumerate() {
        if referrer_key == Pubkey::default() {
            break;
        }
        let rate_bps = platform_state.referral_rates_bps[level];
        let commission = (reward_amount as u128)
            .saturating_mul(rate_bps as u128)
            / BPS_DENOMINATOR as u128;

        msg!(
            "Referral L{}: {} earns {} tokens commission",
            level + 1,
            referrer_key,
            commission as u64
        );
    }
    Ok(())
}
