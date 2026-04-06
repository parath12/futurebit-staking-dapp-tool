use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::errors::StakingError;
use crate::state::{PlatformState, UserStakeAccount};

// ─── Fund Reward Pool ─────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct FundRewardPool<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"platform_state"],
        bump = platform_state.bump,
        constraint = platform_state.admin == admin.key() @ StakingError::Unauthorized,
    )]
    pub platform_state: Account<'info, PlatformState>,

    #[account(
        mut,
        seeds = [b"reward_vault"],
        bump,
        token::mint = platform_state.token_mint,
        token::authority = platform_state,
    )]
    pub reward_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = platform_state.token_mint,
        token::authority = admin,
    )]
    pub admin_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn fund_reward_pool(ctx: Context<FundRewardPool>, amount: u64) -> Result<()> {
    require!(amount > 0, StakingError::ZeroStakeAmount);

    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.admin_token_account.to_account_info(),
            to: ctx.accounts.reward_vault.to_account_info(),
            authority: ctx.accounts.admin.to_account_info(),
        },
    );
    token::transfer(transfer_ctx, amount)?;

    msg!("Reward pool funded with {} tokens.", amount);
    Ok(())
}

// ─── Set Base APY ─────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct SetRewardRate<'info> {
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"platform_state"],
        bump = platform_state.bump,
        constraint = platform_state.admin == admin.key() @ StakingError::Unauthorized,
    )]
    pub platform_state: Account<'info, PlatformState>,
}

pub fn set_reward_rate(ctx: Context<SetRewardRate>, new_apy_bps: u64) -> Result<()> {
    require!(new_apy_bps <= 10_000, StakingError::InvalidRewardRate);

    ctx.accounts.platform_state.base_apy_bps = new_apy_bps;
    msg!("Base APY updated to {} bps ({:.2}%)", new_apy_bps, new_apy_bps as f64 / 100.0);
    Ok(())
}

// ─── Set Referral Rates ───────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct SetReferralRates<'info> {
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"platform_state"],
        bump = platform_state.bump,
        constraint = platform_state.admin == admin.key() @ StakingError::Unauthorized,
    )]
    pub platform_state: Account<'info, PlatformState>,
}

pub fn set_referral_rates(
    ctx: Context<SetReferralRates>,
    new_rates_bps: [u64; 10],
) -> Result<()> {
    // Validate total referral rate doesn't exceed a reasonable cap (e.g. 30%)
    let total: u64 = new_rates_bps.iter().sum();
    require!(total <= 3_000, StakingError::InvalidRewardRate);

    ctx.accounts.platform_state.referral_rates_bps = new_rates_bps;
    msg!("Referral rates updated. Total: {} bps", total);
    Ok(())
}

// ─── Block / Unblock User ─────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(target_user: Pubkey)]
pub struct ManageUser<'info> {
    pub admin: Signer<'info>,

    #[account(
        seeds = [b"platform_state"],
        bump = platform_state.bump,
        constraint = platform_state.admin == admin.key() @ StakingError::Unauthorized,
    )]
    pub platform_state: Account<'info, PlatformState>,

    #[account(
        mut,
        seeds = [b"user_stake", target_user.as_ref()],
        bump = user_stake_account.bump,
    )]
    pub user_stake_account: Account<'info, UserStakeAccount>,
}

pub fn block_user(ctx: Context<ManageUser>, _target_user: Pubkey) -> Result<()> {
    ctx.accounts.user_stake_account.is_blocked = true;
    msg!("User {} has been BLOCKED.", ctx.accounts.user_stake_account.user);
    Ok(())
}

pub fn unblock_user(ctx: Context<ManageUser>, _target_user: Pubkey) -> Result<()> {
    ctx.accounts.user_stake_account.is_blocked = false;
    msg!("User {} has been UNBLOCKED.", ctx.accounts.user_stake_account.user);
    Ok(())
}

// ─── Pause / Unpause Platform ─────────────────────────────────────────────────

#[derive(Accounts)]
pub struct SetPauseState<'info> {
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"platform_state"],
        bump = platform_state.bump,
        constraint = platform_state.admin == admin.key() @ StakingError::Unauthorized,
    )]
    pub platform_state: Account<'info, PlatformState>,
}

pub fn set_pause_state(ctx: Context<SetPauseState>, paused: bool) -> Result<()> {
    ctx.accounts.platform_state.is_paused = paused;
    msg!("Platform pause state set to: {}", paused);
    Ok(())
}

// ─── Transfer Admin ───────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct TransferAdmin<'info> {
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"platform_state"],
        bump = platform_state.bump,
        constraint = platform_state.admin == admin.key() @ StakingError::Unauthorized,
    )]
    pub platform_state: Account<'info, PlatformState>,
}

pub fn transfer_admin(ctx: Context<TransferAdmin>, new_admin: Pubkey) -> Result<()> {
    ctx.accounts.platform_state.admin = new_admin;
    msg!("Admin transferred to {}", new_admin);
    Ok(())
}
