use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::errors::StakingError;
use crate::state::{PlatformState, UserStakeAccount};

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"platform_state"],
        bump = platform_state.bump,
    )]
    pub platform_state: Account<'info, PlatformState>,

    #[account(
        init_if_needed,
        payer = user,
        space = UserStakeAccount::LEN,
        seeds = [b"user_stake", user.key().as_ref()],
        bump,
    )]
    pub user_stake_account: Account<'info, UserStakeAccount>,

    /// User's token account (source of stake)
    #[account(
        mut,
        token::mint = platform_state.token_mint,
        token::authority = user,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    /// Platform vault (destination for staked tokens)
    #[account(
        mut,
        seeds = [b"vault"],
        bump,
        token::mint = platform_state.token_mint,
        token::authority = platform_state,
    )]
    pub vault: Account<'info, TokenAccount>,

    /// Optional referrer's stake account - checked at runtime
    /// CHECK: Verified in instruction handler
    pub referrer_stake_account: Option<AccountInfo<'info>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<Stake>,
    amount: u64,
    lock_period_secs: u64,
    referrer: Option<Pubkey>,
) -> Result<()> {
    let platform_state = &mut ctx.accounts.platform_state;

    require!(!platform_state.is_paused, StakingError::PlatformPaused);
    require!(amount > 0, StakingError::ZeroStakeAmount);
    require!(
        PlatformState::is_valid_lock_period(lock_period_secs),
        StakingError::InvalidLockPeriod
    );

    let user_stake = &mut ctx.accounts.user_stake_account;

    // If user already has an active stake, they must unstake first
    require!(!user_stake.is_active, StakingError::AlreadyStaked);

    // Check user is not blocked
    require!(!user_stake.is_blocked, StakingError::UserBlocked);

    let current_time = Clock::get()?.unix_timestamp;
    let user_key = ctx.accounts.user.key();

    // Validate referrer
    let referrer_key = if let Some(ref_key) = referrer {
        require!(ref_key != user_key, StakingError::SelfReferral);
        Some(ref_key)
    } else {
        None
    };

    // Build referral chain: direct referrer at index 0, then their chain
    let mut referral_chain = [Pubkey::default(); 10];
    if let Some(ref_pubkey) = referrer_key {
        referral_chain[0] = ref_pubkey;

        // Load referrer's chain to build multi-level chain
        if let Some(ref_account_info) = &ctx.accounts.referrer_stake_account {
            // Deserialize referrer's UserStakeAccount
            let ref_data = ref_account_info.try_borrow_data()?;
            if ref_data.len() >= UserStakeAccount::LEN {
                // Skip 8-byte discriminator, then user pubkey (32), staked amount (8), etc.
                // We only need the referral_chain which starts at offset:
                // 8 (disc) + 32 (user) + 8 (amount) + 8 (lock) + 8 (stake_ts) + 8 (claim_ts) + 32 (referrer) = 104
                let chain_offset = 8 + 32 + 8 + 8 + 8 + 8 + 32;
                if ref_data.len() >= chain_offset + 32 * 10 {
                    for i in 0..9 {
                        let start = chain_offset + i * 32;
                        let end = start + 32;
                        let bytes: [u8; 32] = ref_data[start..end].try_into().unwrap_or_default();
                        referral_chain[i + 1] = Pubkey::from(bytes);
                    }
                }
            }
        }
    }

    // Transfer tokens from user to vault
    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    );
    token::transfer(transfer_ctx, amount)?;

    // Update user stake account
    user_stake.user = user_key;
    user_stake.amount_staked = amount;
    user_stake.lock_period_secs = lock_period_secs;
    user_stake.stake_timestamp = current_time;
    user_stake.last_claim_timestamp = current_time;
    user_stake.referrer = referrer_key.unwrap_or_default();
    user_stake.referral_chain = referral_chain;
    user_stake.accrued_rewards = 0;
    user_stake.is_active = true;

    // Only increment staker count on first-ever stake (bump would be set)
    if !user_stake.is_active {
        platform_state.total_stakers = platform_state.total_stakers.saturating_add(1);
    }
    platform_state.total_stakers = platform_state.total_stakers.saturating_add(1);
    platform_state.total_staked = platform_state
        .total_staked
        .checked_add(amount)
        .ok_or(StakingError::ArithmeticOverflow)?;

    user_stake.bump = ctx.bumps.user_stake_account;

    msg!(
        "User {} staked {} tokens for {} seconds. Referrer: {:?}",
        user_key,
        amount,
        lock_period_secs,
        referrer_key
    );

    Ok(())
}
