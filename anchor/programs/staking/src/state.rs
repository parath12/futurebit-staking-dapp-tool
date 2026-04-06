use anchor_lang::prelude::*;

// Lock period options in seconds
pub const LOCK_PERIOD_15D: u64 = 15 * 24 * 60 * 60;
pub const LOCK_PERIOD_30D: u64 = 30 * 24 * 60 * 60;
pub const LOCK_PERIOD_90D: u64 = 90 * 24 * 60 * 60;
pub const LOCK_PERIOD_180D: u64 = 180 * 24 * 60 * 60;
pub const LOCK_PERIOD_365D: u64 = 365 * 24 * 60 * 60;
pub const LOCK_PERIOD_2Y: u64 = 2 * 365 * 24 * 60 * 60;
pub const LOCK_PERIOD_5Y: u64 = 5 * 365 * 24 * 60 * 60;
pub const LOCK_PERIOD_10Y: u64 = 10 * 365 * 24 * 60 * 60;

// Claim cooldown: 24 hours in seconds
pub const CLAIM_COOLDOWN: i64 = 24 * 60 * 60;

// Basis points denominator (10000 = 100%)
pub const BPS_DENOMINATOR: u64 = 10_000;

// Default referral rates in basis points per level
pub const DEFAULT_REFERRAL_RATES: [u64; 10] = [
    25,  // Level 1:  0.25%
    50,  // Level 2:  0.50%
    125, // Level 3:  1.25%
    150, // Level 4:  1.50%
    200, // Level 5:  2.00%
    325, // Level 6:  3.25%
    350, // Level 7:  3.50%
    425, // Level 8:  4.25%
    550, // Level 9:  5.50%
    800, // Level 10: 8.00%
];

// Seconds per year for APY calculation
pub const SECONDS_PER_YEAR: u64 = 365 * 24 * 60 * 60;

/// Global platform configuration account (PDA)
#[account]
pub struct PlatformState {
    /// Admin/owner of the platform
    pub admin: Pubkey,
    /// The FBiT token mint address
    pub token_mint: Pubkey,
    /// Platform token vault (holds staked tokens)
    pub vault: Pubkey,
    /// Reward pool vault (holds reward tokens)
    pub reward_vault: Pubkey,
    /// Total tokens currently staked on the platform
    pub total_staked: u64,
    /// Total rewards distributed all-time
    pub total_rewards_paid: u64,
    /// Annual Percentage Yield in basis points (e.g. 1200 = 12%)
    pub base_apy_bps: u64,
    /// Referral commission rates per level in basis points [10 levels]
    pub referral_rates_bps: [u64; 10],
    /// Whether the platform is paused
    pub is_paused: bool,
    /// Total number of stakers
    pub total_stakers: u64,
    /// PDA bump
    pub bump: u8,
}

impl PlatformState {
    pub const LEN: usize = 8  // discriminator
        + 32  // admin
        + 32  // token_mint
        + 32  // vault
        + 32  // reward_vault
        + 8   // total_staked
        + 8   // total_rewards_paid
        + 8   // base_apy_bps
        + 8 * 10  // referral_rates_bps [10]
        + 1   // is_paused
        + 8   // total_stakers
        + 1;  // bump

    pub fn is_valid_lock_period(lock_period: u64) -> bool {
        matches!(
            lock_period,
            LOCK_PERIOD_15D
                | LOCK_PERIOD_30D
                | LOCK_PERIOD_90D
                | LOCK_PERIOD_180D
                | LOCK_PERIOD_365D
                | LOCK_PERIOD_2Y
                | LOCK_PERIOD_5Y
                | LOCK_PERIOD_10Y
        )
    }
}

/// Per-user staking account (PDA)
#[account]
pub struct UserStakeAccount {
    /// The user's wallet public key
    pub user: Pubkey,
    /// Amount of tokens staked (in lamports/smallest units)
    pub amount_staked: u64,
    /// Lock period in seconds
    pub lock_period_secs: u64,
    /// Unix timestamp when staking began
    pub stake_timestamp: i64,
    /// Unix timestamp of last reward claim
    pub last_claim_timestamp: i64,
    /// Direct referrer's public key (zero address = no referrer)
    pub referrer: Pubkey,
    /// Full referral chain up to 10 levels [level0=direct, level9=oldest]
    pub referral_chain: [Pubkey; 10],
    /// Accumulated unclaimed rewards
    pub accrued_rewards: u64,
    /// Total rewards claimed over lifetime
    pub total_rewards_claimed: u64,
    /// Total referral commissions earned by this user
    pub total_referral_earned: u64,
    /// Pending referral commissions not yet claimed
    pub pending_referral_rewards: u64,
    /// Whether this user is blocked
    pub is_blocked: bool,
    /// Whether this user has an active stake
    pub is_active: bool,
    /// PDA bump
    pub bump: u8,
}

impl UserStakeAccount {
    pub const LEN: usize = 8   // discriminator
        + 32  // user
        + 8   // amount_staked
        + 8   // lock_period_secs
        + 8   // stake_timestamp
        + 8   // last_claim_timestamp
        + 32  // referrer
        + 32 * 10  // referral_chain
        + 8   // accrued_rewards
        + 8   // total_rewards_claimed
        + 8   // total_referral_earned
        + 8   // pending_referral_rewards
        + 1   // is_blocked
        + 1   // is_active
        + 1;  // bump

    /// Calculate pending staking rewards since last claim
    pub fn calculate_pending_rewards(&self, current_time: i64, apy_bps: u64) -> u64 {
        if !self.is_active || self.amount_staked == 0 {
            return 0;
        }

        let elapsed = current_time.saturating_sub(self.last_claim_timestamp) as u64;
        if elapsed == 0 {
            return 0;
        }

        // reward = amount * apy_bps * elapsed / (SECONDS_PER_YEAR * BPS_DENOMINATOR)
        let reward = (self.amount_staked as u128)
            .saturating_mul(apy_bps as u128)
            .saturating_mul(elapsed as u128)
            / (SECONDS_PER_YEAR as u128 * BPS_DENOMINATOR as u128);

        reward as u64
    }

    /// Check if the lock period has elapsed
    pub fn is_unlocked(&self, current_time: i64) -> bool {
        let unlock_time = self.stake_timestamp.saturating_add(self.lock_period_secs as i64);
        current_time >= unlock_time
    }

    /// Check if claim cooldown has passed
    pub fn can_claim(&self, current_time: i64) -> bool {
        current_time >= self.last_claim_timestamp.saturating_add(CLAIM_COOLDOWN)
    }
}
