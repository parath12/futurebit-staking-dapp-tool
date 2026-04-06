use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::state::{PlatformState, DEFAULT_REFERRAL_RATES};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    pub token_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = admin,
        space = PlatformState::LEN,
        seeds = [b"platform_state"],
        bump,
    )]
    pub platform_state: Account<'info, PlatformState>,

    #[account(
        init,
        payer = admin,
        token::mint = token_mint,
        token::authority = platform_state,
        seeds = [b"vault"],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = admin,
        token::mint = token_mint,
        token::authority = platform_state,
        seeds = [b"reward_vault"],
        bump,
    )]
    pub reward_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<Initialize>, base_apy_bps: u64) -> Result<()> {
    let platform_state = &mut ctx.accounts.platform_state;
    let bump = ctx.bumps.platform_state;

    platform_state.admin = ctx.accounts.admin.key();
    platform_state.token_mint = ctx.accounts.token_mint.key();
    platform_state.vault = ctx.accounts.vault.key();
    platform_state.reward_vault = ctx.accounts.reward_vault.key();
    platform_state.total_staked = 0;
    platform_state.total_rewards_paid = 0;
    platform_state.base_apy_bps = base_apy_bps;
    platform_state.referral_rates_bps = DEFAULT_REFERRAL_RATES;
    platform_state.is_paused = false;
    platform_state.total_stakers = 0;
    platform_state.bump = bump;

    msg!("FutureBit Staking Platform initialized. APY: {} bps", base_apy_bps);
    Ok(())
}
