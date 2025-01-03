use anchor_lang::prelude::*;
use anchor_spl::token::Token;
use anchor_spl::token_interface::{Mint, Token2022, TokenAccount};

declare_id!("6WnLw2a5dNsoV7ZFAf2VrWrc2GBNwpYEhtRySSwTZdRL");

pub const REWARD_NUM: usize = 3;

pub mod raydium {
    use anchor_lang::prelude::*;
    declare_id!("devi51mZmdwUJGU9hjN27vEz64Gps7uUefqxg27EAtH");
}

#[account]
#[derive(Default, Debug)]
pub struct AmmConfig {
    /// Bump to identify PDA
    pub bump: u8,
    pub index: u16,
    /// Address of the protocol owner
    pub owner: Pubkey,
    /// The protocol fee
    pub protocol_fee_rate: u32,
    /// The trade fee, denominated in hundredths of a bip (10^-6)
    pub trade_fee_rate: u32,
    /// The tick spacing
    pub tick_spacing: u16,
    /// The fund fee, denominated in hundredths of a bip (10^-6)
    pub fund_fee_rate: u32,
    // padding space for upgrade
    pub padding_u32: u32,
    pub fund_owner: Pubkey,
    pub padding: [u64; 3],
}

#[zero_copy(unsafe)]
#[repr(C, packed)]
#[derive(Default, Debug, PartialEq, Eq)]
pub struct RewardInfo {
    /// Reward state
    pub reward_state: u8,
    /// Reward open time
    pub open_time: u64,
    /// Reward end time
    pub end_time: u64,
    /// Reward last update time
    pub last_update_time: u64,
    /// Q64.64 number indicates how many tokens per second are earned per unit of liquidity.
    pub emissions_per_second_x64: u128,
    /// The total amount of reward emissioned
    pub reward_total_emissioned: u64,
    /// The total amount of claimed reward
    pub reward_claimed: u64,
    /// Reward token mint.
    pub token_mint: Pubkey,
    /// Reward vault token account.
    pub token_vault: Pubkey,
    /// The owner that has permission to set reward param
    pub authority: Pubkey,
    /// Q64.64 number that tracks the total tokens earned per unit of liquidity since the reward
    /// emissions were turned on.
    pub reward_growth_global_x64: u128,
}

#[account(zero_copy(unsafe))]
#[repr(C, packed)]
#[derive(Default, Debug)]
pub struct PoolState {
    /// Bump to identify PDA
    pub bump: [u8; 1],
    // Which config the pool belongs
    pub amm_config: Pubkey,
    // Pool creator
    pub owner: Pubkey,

    /// Token pair of the pool, where token_mint_0 address < token_mint_1 address
    pub token_mint_0: Pubkey,
    pub token_mint_1: Pubkey,

    /// Token pair vault
    pub token_vault_0: Pubkey,
    pub token_vault_1: Pubkey,

    /// observation account key
    pub observation_key: Pubkey,

    /// mint0 and mint1 decimals
    pub mint_decimals_0: u8,
    pub mint_decimals_1: u8,

    /// The minimum number of ticks between initialized ticks
    pub tick_spacing: u16,
    /// The currently in range liquidity available to the pool.
    pub liquidity: u128,
    /// The current price of the pool as a sqrt(token_1/token_0) Q64.64 value
    pub sqrt_price_x64: u128,
    /// The current tick of the pool, i.e. according to the last tick transition that was run.
    pub tick_current: i32,

    pub padding3: u16,
    pub padding4: u16,

    /// The fee growth as a Q64.64 number, i.e. fees of token_0 and token_1 collected per
    /// unit of liquidity for the entire life of the pool.
    pub fee_growth_global_0_x64: u128,
    pub fee_growth_global_1_x64: u128,

    /// The amounts of token_0 and token_1 that are owed to the protocol.
    pub protocol_fees_token_0: u64,
    pub protocol_fees_token_1: u64,

    /// The amounts in and out of swap token_0 and token_1
    pub swap_in_amount_token_0: u128,
    pub swap_out_amount_token_1: u128,
    pub swap_in_amount_token_1: u128,
    pub swap_out_amount_token_0: u128,

    /// Bitwise representation of the state of the pool
    /// bit0, 1: disable open position and increase liquidity, 0: normal
    /// bit1, 1: disable decrease liquidity, 0: normal
    /// bit2, 1: disable collect fee, 0: normal
    /// bit3, 1: disable collect reward, 0: normal
    /// bit4, 1: disable swap, 0: normal
    pub status: u8,
    /// Leave blank for future use
    pub padding: [u8; 7],

    pub reward_infos: [RewardInfo; REWARD_NUM],

    /// Packed initialized tick array state
    pub tick_array_bitmap: [u64; 16],

    /// except protocol_fee and fund_fee
    pub total_fees_token_0: u64,
    /// except protocol_fee and fund_fee
    pub total_fees_claimed_token_0: u64,
    pub total_fees_token_1: u64,
    pub total_fees_claimed_token_1: u64,

    pub fund_fees_token_0: u64,
    pub fund_fees_token_1: u64,

    // The timestamp allowed for swap in the pool.
    pub open_time: u64,
    // account recent update epoch
    pub recent_epoch: u64,

    // Unused bytes for future upgrades.
    pub padding1: [u64; 24],
    pub padding2: [u64; 32],
}

/// Seed to derive account address and signature
pub const OBSERVATION_SEED: &str = "observation";
// Number of ObservationState element
pub const OBSERVATION_NUM: usize = 100;
pub const OBSERVATION_UPDATE_DURATION_DEFAULT: u32 = 15;

/// The element of observations in ObservationState
#[zero_copy(unsafe)]
#[repr(C, packed)]
#[derive(Default, Debug)]
pub struct Observation {
    /// The block timestamp of the observation
    pub block_timestamp: u32,
    /// the cumulative of tick during the duration time
    pub tick_cumulative: i64,
    /// padding for feature update
    pub padding: [u64; 4],
}

impl Observation {
    pub const LEN: usize = 4 + 8 + 8 * 4;
}

#[account(zero_copy(unsafe))]
#[repr(C, packed)]
pub struct ObservationState {
    /// Whether the ObservationState is initialized
    pub initialized: bool,
    /// recent update epoch
    pub recent_epoch: u64,
    /// the most-recently updated index of the observations array
    pub observation_index: u16,
    /// belongs to which pool
    pub pool_id: Pubkey,
    /// observation array
    pub observations: [Observation; OBSERVATION_NUM],
    /// padding for feature update
    pub padding: [u64; 4],
}

#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct SwapParams {
    pub amount: u64,
    pub other_amount_threshold: u64,
    pub sqrt_price_limit_x64: u128,
    pub is_base_input: bool,
}

#[event]
pub struct SwapEvent {
    pub amount_in: u64,
    pub amount_out_min: u64,
}

#[derive(Accounts)]
pub struct Ping {}

#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: TODO
    pub amm_config: UncheckedAccount<'info>,
    // pub amm_config: Box<Account<'info, AmmConfig>>,
    /// CHECK: TODO
    #[account(mut)]
    pub pool_state: UncheckedAccount<'info>,
    // pub pool_state: AccountLoader<'info, PoolState>,
    #[account(mut)]
    pub input_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(mut)]
    pub output_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(mut)]
    pub input_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(mut)]
    pub output_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK: TODO
    #[account(mut)]
    pub observation_state: UncheckedAccount<'info>,
    // pub observation_state: AccountLoader<'info, ObservationState>,
    pub token_program: Program<'info, Token>,

    pub token_program_2022: Program<'info, Token2022>,

    /// CHECK: The `memo_program` account is used for memo-related functionality. It is passed through
    /// to the instruction without further checks.
    pub memo_program: UncheckedAccount<'info>,

    pub input_vault_mint: Box<InterfaceAccount<'info, Mint>>,

    pub output_vault_mint: Box<InterfaceAccount<'info, Mint>>,

    /// CHECK: TODO
    pub raydium_program: AccountInfo<'info>,
}

#[program]
pub mod raydium_swap {
    use super::*;

    pub fn ping(ctx: Context<Ping>) -> Result<()> {
        msg!("Ping from program: {:?}", ctx.program_id);
        Ok(())
    }

    pub fn swap<'a, 'b, 'c: 'info, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, Swap<'info>>,
        params: SwapParams,
    ) -> Result<()> {
        let accounts = vec![
            AccountMeta::new_readonly(ctx.accounts.payer.key(), true),
            AccountMeta::new_readonly(ctx.accounts.amm_config.key(), false),
            AccountMeta::new(ctx.accounts.pool_state.key(), false),
            AccountMeta::new(ctx.accounts.input_token_account.key(), false),
            AccountMeta::new(ctx.accounts.output_token_account.key(), false),
            AccountMeta::new(ctx.accounts.input_vault.key(), false),
            AccountMeta::new(ctx.accounts.output_vault.key(), false),
            AccountMeta::new(ctx.accounts.observation_state.key(), false),
            AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
            AccountMeta::new_readonly(ctx.accounts.token_program_2022.key(), false),
            AccountMeta::new_readonly(ctx.accounts.memo_program.key(), false),
            AccountMeta::new_readonly(ctx.accounts.input_vault_mint.key(), false),
            AccountMeta::new_readonly(ctx.accounts.output_vault_mint.key(), false),
        ];

        let raydium_program = ctx.accounts.raydium_program.key();

        let swap_data = SwapParams {
            amount: params.amount,
            other_amount_threshold: params.other_amount_threshold,
            sqrt_price_limit_x64: params.sqrt_price_limit_x64,
            is_base_input: params.is_base_input,
        };

        msg!("SwapParams:");
        msg!("  amount: {}", params.amount);
        msg!(
            "  other_amount_threshold: {}",
            params.other_amount_threshold
        );
        msg!("  sqrt_price_limit_x64: {}", params.sqrt_price_limit_x64);
        msg!("  is_base_input: {}", params.is_base_input);

        let discriminator =
            anchor_lang::solana_program::hash::hash("global:swap_v2".as_bytes()).to_bytes();

        msg!("Discriminator (Decimal): {:?}", &discriminator[..8]);
        msg!(
            "Discriminator (Hex): {:?}",
            &discriminator[..8]
                .iter()
                .map(|byte| format!("{:02x}", byte))
                .collect::<Vec<_>>()
        );

        let mut instruction_data = Vec::new();
        instruction_data.extend_from_slice(&discriminator[..8]);

        msg!(
            "Instruction Data After extend: {:?}",
            instruction_data
                .iter()
                .map(|b| format!("{:02x}", b))
                .collect::<Vec<_>>()
        );

        swap_data.serialize(&mut instruction_data)?;

        msg!(
            "Instruction Data After Serialization: {:?}",
            instruction_data
                .iter()
                .map(|b| format!("{:02x}", b))
                .collect::<Vec<_>>()
        );

        let mut accounts_with_remaining = accounts;
        accounts_with_remaining.extend(
            ctx.remaining_accounts
                .iter()
                .map(|acc| AccountMeta::new(acc.key(), false)),
        );

        let swap_ix = anchor_lang::solana_program::instruction::Instruction {
            program_id: raydium_program,
            accounts: accounts_with_remaining,
            data: instruction_data.to_vec(),
        };

        let mut account_infos = vec![
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.amm_config.to_account_info(),
            ctx.accounts.pool_state.to_account_info(),
            ctx.accounts.input_token_account.to_account_info(),
            ctx.accounts.output_token_account.to_account_info(),
            ctx.accounts.input_vault.to_account_info(),
            ctx.accounts.output_vault.to_account_info(),
            ctx.accounts.observation_state.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.token_program_2022.to_account_info(),
            ctx.accounts.memo_program.to_account_info(),
            ctx.accounts.input_vault_mint.to_account_info(),
            ctx.accounts.output_vault_mint.to_account_info(),
        ];

        account_infos.extend(
            ctx.remaining_accounts
                .iter()
                .map(|acc| acc.to_account_info()),
        );

        anchor_lang::solana_program::program::invoke(&swap_ix, &account_infos)?;

        emit!(SwapEvent {
            amount_in: params.amount,
            amount_out_min: params.other_amount_threshold,
        });

        Ok(())
    }
}
