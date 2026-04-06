use anchor_lang::prelude::*;

#[error_code]
pub enum StakingError {
    #[msg("Invalid lock period. Choose: 15d, 30d, 90d, 180d, 365d, 2y, 5y, 10y")]
    InvalidLockPeriod,

    #[msg("Tokens are still locked. Cannot unstake before lock period ends.")]
    TokensStillLocked,

    #[msg("No active stake found for this user.")]
    NoActiveStake,

    #[msg("User already has an active stake. Unstake first.")]
    AlreadyStaked,

    #[msg("Insufficient reward pool balance.")]
    InsufficientRewardPool,

    #[msg("No rewards available to claim.")]
    NoRewardsToClaim,

    #[msg("User is blocked from this platform.")]
    UserBlocked,

    #[msg("Unauthorized. Only admin can perform this action.")]
    Unauthorized,

    #[msg("Invalid referrer. Cannot refer yourself.")]
    SelfReferral,

    #[msg("Referrer has no active stake.")]
    ReferrerNotStaked,

    #[msg("Arithmetic overflow occurred.")]
    ArithmeticOverflow,

    #[msg("Invalid reward rate. Must be between 0 and 10000 bps (100%).")]
    InvalidRewardRate,

    #[msg("Stake amount must be greater than zero.")]
    ZeroStakeAmount,

    #[msg("Platform is currently paused.")]
    PlatformPaused,

    #[msg("Claim cooldown not elapsed. Wait 24 hours between claims.")]
    ClaimCooldown,
}
