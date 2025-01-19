use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{sync_native, SyncNative};
use anchor_spl::token::{Token, TokenAccount};
use anchor_spl::token_interface::Token2022;
use spl_token_2022::{extension::StateWithExtensions, state::Account as TokenAccount2022};

declare_id!("FZSd3d2QmSfyD5qr8UXY9x8poC2V3mKf8DVyf2BCDLzq");

#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct RaydiumSwapArgs {
    pub amount: u64,
    pub other_amount_threshold: u64,
    pub sqrt_price_limit_x64: u128,
    pub is_base_input: bool,
}

#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct SwapParams {
    pub swap_len: u64,
    pub amount: u64,
    pub other_amount_threshold: u64,
    pub is_base_token_sol: bool,
    pub is_quote_token_sol: bool,
}

#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct BatchSwapParams {
    pub num_routes: u64,
    pub swap_lens: Vec<u64>,
    pub amounts: Vec<u64>,
    pub other_amounts_threshold: Vec<u64>,
    pub is_base_token_sol: bool,
    pub is_quote_token_sol: bool,
}

#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    pub token_program: Program<'info, Token>,

    pub token_program_2022: Program<'info, Token2022>,

    /// CHECK: TODO
    pub memo_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,

    /// CHECK: TODO
    pub raydium_program: AccountInfo<'info>,

    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[program]
pub mod raydium_swap {
    use std::str::FromStr;

    use super::*;

    pub fn swap<'a, 'b, 'c: 'info, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, Swap<'info>>,
        params: SwapParams,
    ) -> Result<()> {
        let swap_len = params.swap_len;

        let remaining_accounts = &ctx.remaining_accounts;

        let mut amm_configs = Vec::new();
        let mut pool_states = Vec::new();
        let mut observation_states = Vec::new();
        let mut token_accounts = Vec::new();
        let mut token_vaults = Vec::new();
        let mut token_mints = Vec::new();
        let mut token_programs = Vec::new();
        let mut other_accounts = Vec::new();

        let mut index = 0;

        for _ in 0..swap_len {
            amm_configs.push(&remaining_accounts[index]);
            index += 1;
        }

        for _ in 0..swap_len {
            pool_states.push(&remaining_accounts[index]);
            index += 1;
        }

        for _ in 0..swap_len {
            observation_states.push(&remaining_accounts[index]);
            index += 1;
        }

        for _ in 0..=swap_len {
            token_accounts.push(&remaining_accounts[index]);
            index += 1;
        }

        for _ in 0..(2 * swap_len) {
            token_vaults.push(&remaining_accounts[index]);
            index += 1;
        }

        for _ in 0..=swap_len {
            token_mints.push(&remaining_accounts[index]);
            index += 1;
        }

        for _ in 0..=swap_len {
            token_programs.push(&remaining_accounts[index]);
            index += 1;
        }

        for _ in 0..(3 * swap_len) {
            other_accounts.push(&remaining_accounts[index]);
            index += 1;
        }

        for (loop_index, token_account_info) in token_accounts.iter().enumerate() {
            if token_account_info.owner == &anchor_lang::solana_program::system_program::ID {
                let associated_token_account_instruction = anchor_spl::associated_token::Create {
                    payer: ctx.accounts.payer.to_account_info(),
                    associated_token: (*token_account_info).clone(),
                    authority: ctx.accounts.payer.to_account_info(),
                    mint: token_mints[loop_index].to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    token_program: token_programs[loop_index].to_account_info(),
                };

                anchor_spl::associated_token::create(CpiContext::new_with_signer(
                    ctx.accounts.associated_token_program.to_account_info(),
                    associated_token_account_instruction,
                    &[],
                ))?;
            }
        }

        let mut amount_in = params.amount;
        let amount_out_min = params.other_amount_threshold;

        if params.is_base_token_sol {
            let wsol_account = &token_accounts[0];
            let wsol_account_info = wsol_account.to_account_info();

            let wsol_mint = &token_mints[0];

            if wsol_mint.to_account_info().key
                != &Pubkey::from_str("So11111111111111111111111111111111111111112").unwrap()
            {
                return Err(ErrorCode::InvalidBaseTokenAccount.into());
            }

            // SOL to WSOL
            anchor_lang::system_program::transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    anchor_lang::system_program::Transfer {
                        from: ctx.accounts.payer.to_account_info(),
                        to: wsol_account_info.clone(),
                    },
                ),
                amount_in,
            )?;

            sync_native(CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                SyncNative {
                    account: wsol_account_info.to_account_info(),
                },
            ))?;
        }

        let mut swap_index = 0;

        for _ in 0..swap_len {
            let accounts = vec![
                AccountMeta::new(ctx.accounts.payer.key(), true),
                AccountMeta::new_readonly(amm_configs[swap_index].key(), false),
                AccountMeta::new(pool_states[swap_index].key(), false),
                AccountMeta::new(token_accounts[swap_index].key(), false),
                AccountMeta::new(token_accounts[swap_index + 1].key(), false),
                AccountMeta::new(token_vaults[2 * swap_index].key(), false),
                AccountMeta::new(token_vaults[2 * swap_index + 1].key(), false),
                AccountMeta::new(observation_states[swap_index].key(), false),
                AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
                AccountMeta::new_readonly(ctx.accounts.token_program_2022.key(), false),
                AccountMeta::new_readonly(ctx.accounts.memo_program.key(), false),
                AccountMeta::new_readonly(token_mints[swap_index].key(), false),
                AccountMeta::new_readonly(token_mints[swap_index + 1].key(), false),
            ];

            let raydium_program = ctx.accounts.raydium_program.key();

            let swap_data = RaydiumSwapArgs {
                amount: amount_in,
                other_amount_threshold: 0,
                sqrt_price_limit_x64: 0,
                is_base_input: true,
            };

            let discriminator =
                anchor_lang::solana_program::hash::hash("global:swap_v2".as_bytes()).to_bytes();

            let mut instruction_data = Vec::new();
            instruction_data.extend_from_slice(&discriminator[..8]);

            swap_data.serialize(&mut instruction_data)?;

            let mut accounts_with_remaining = accounts;

            accounts_with_remaining.push(AccountMeta::new(
                other_accounts[3 * swap_index].key(),
                false,
            ));
            accounts_with_remaining.push(AccountMeta::new(
                other_accounts[3 * swap_index + 1].key(),
                false,
            ));
            accounts_with_remaining.push(AccountMeta::new(
                other_accounts[3 * swap_index + 2].key(),
                false,
            ));

            let swap_ix = anchor_lang::solana_program::instruction::Instruction {
                program_id: raydium_program,
                accounts: accounts_with_remaining,
                data: instruction_data.to_vec(),
            };

            let mut account_infos = vec![
                ctx.accounts.payer.to_account_info(),
                amm_configs[swap_index].to_account_info(),
                pool_states[swap_index].to_account_info(),
                token_accounts[swap_index].to_account_info(),
                token_accounts[swap_index + 1].to_account_info(),
                token_vaults[2 * swap_index].to_account_info(),
                token_vaults[2 * swap_index + 1].to_account_info(),
                observation_states[swap_index].to_account_info(),
                ctx.accounts.token_program.to_account_info(),
                ctx.accounts.token_program_2022.to_account_info(),
                ctx.accounts.memo_program.to_account_info(),
                token_mints[swap_index].to_account_info(),
                token_mints[swap_index + 1].to_account_info(),
            ];

            account_infos.push(other_accounts[3 * swap_index].to_account_info());
            account_infos.push(other_accounts[3 * swap_index + 1].to_account_info());
            account_infos.push(other_accounts[3 * swap_index + 2].to_account_info());

            let token_account_pubkey = &token_accounts[swap_index + 1];
            let token_program_pubkey = &token_programs[swap_index + 1];

            // let balance_before = Account::<TokenAccount>::try_from(&token_accounts[swap_index + 1])
            //     .map_err(|_| ErrorCode::InvalidTokenAccount)?
            //     .amount;

            let balance_before = if token_program_pubkey.key()
                == ctx.accounts.token_program_2022.key()
            {
                let account_data = token_account_pubkey.try_borrow_data()?;
                let token_account = StateWithExtensions::<TokenAccount2022>::unpack(&account_data)
                    .map_err(|_| ErrorCode::InvalidTokenAccount)?;

                token_account.base.amount
            } else {
                Account::<TokenAccount>::try_from(&token_accounts[swap_index + 1])
                    .map_err(|_| ErrorCode::InvalidTokenAccount)?
                    .amount
            };

            anchor_lang::solana_program::program::invoke(&swap_ix, &account_infos)?;

            // let balance_after = Account::<TokenAccount>::try_from(&token_accounts[swap_index + 1])
            //     .map_err(|_| ErrorCode::InvalidTokenAccount)?
            //     .amount;

            let balance_after = if token_program_pubkey.key()
                == ctx.accounts.token_program_2022.key()
            {
                let account_data = token_account_pubkey.try_borrow_data()?;
                let token_account = StateWithExtensions::<TokenAccount2022>::unpack(&account_data)
                    .map_err(|_| ErrorCode::InvalidTokenAccount)?;

                token_account.base.amount
            } else {
                Account::<TokenAccount>::try_from(&token_accounts[swap_index + 1])
                    .map_err(|_| ErrorCode::InvalidTokenAccount)?
                    .amount
            };

            amount_in = balance_after - balance_before;

            swap_index += 1;
        }

        require_gte!(
            amount_in,
            amount_out_min,
            ErrorCode::TooLittleOutputReceived
        );

        if params.is_quote_token_sol {
            let wsol_account = &token_accounts[swap_len as usize];
            let wsol_account_info = wsol_account.to_account_info();

            let wsol_mint = &token_mints[swap_len as usize];

            if wsol_mint.to_account_info().key
                != &Pubkey::from_str("So11111111111111111111111111111111111111112").unwrap()
            {
                return Err(ErrorCode::InvalidQuoteTokenAccount.into());
            }

            // WSOL to SOL
            anchor_spl::token::close_account(CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::CloseAccount {
                    account: wsol_account_info,
                    destination: ctx.accounts.payer.to_account_info(),
                    authority: ctx.accounts.payer.to_account_info(),
                },
            ))?;
        }

        emit!(SwapEvent {
            amount_in: params.amount,
            amount_out: amount_in
        });

        Ok(())
    }

    pub fn batch_swap<'a, 'b, 'c: 'info, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, Swap<'info>>,
        params: BatchSwapParams,
    ) -> Result<()> {
        let num_routes = params.num_routes;
        let mut account_idx = 0;

        let mut total_amount_in = 0;
        let mut total_amount_out_min = 0;
        let mut total_amount_out = 0;

        let remaining_accounts = &ctx.remaining_accounts;

        for k in 0..num_routes {
            let swap_len = params.swap_lens[k as usize];

            let mut amm_configs = Vec::new();
            let mut pool_states = Vec::new();
            let mut observation_states = Vec::new();
            let mut token_accounts = Vec::new();
            let mut token_vaults = Vec::new();
            let mut token_mints = Vec::new();
            let mut token_programs = Vec::new();
            let mut other_accounts = Vec::new();

            for _ in 0..swap_len {
                amm_configs.push(&remaining_accounts[account_idx]);
                account_idx += 1;
            }

            for _ in 0..swap_len {
                pool_states.push(&remaining_accounts[account_idx]);
                account_idx += 1;
            }

            for _ in 0..swap_len {
                observation_states.push(&remaining_accounts[account_idx]);
                account_idx += 1;
            }

            for _ in 0..=swap_len {
                token_accounts.push(&remaining_accounts[account_idx]);
                account_idx += 1;
            }

            for _ in 0..(2 * swap_len) {
                token_vaults.push(&remaining_accounts[account_idx]);
                account_idx += 1;
            }

            for _ in 0..=swap_len {
                token_mints.push(&remaining_accounts[account_idx]);
                account_idx += 1;
            }

            for _ in 0..=swap_len {
                token_programs.push(&remaining_accounts[account_idx]);
                account_idx += 1;
            }

            for _ in 0..(3 * swap_len) {
                other_accounts.push(&remaining_accounts[account_idx]);
                account_idx += 1;
            }

            for (loop_index, token_account_info) in token_accounts.iter().enumerate() {
                if token_account_info.owner == &anchor_lang::solana_program::system_program::ID {
                    let associated_token_account_instruction =
                        anchor_spl::associated_token::Create {
                            payer: ctx.accounts.payer.to_account_info(),
                            associated_token: (*token_account_info).clone(),
                            authority: ctx.accounts.payer.to_account_info(),
                            mint: token_mints[loop_index].to_account_info(),
                            system_program: ctx.accounts.system_program.to_account_info(),
                            token_program: token_programs[loop_index].to_account_info(),
                        };

                    anchor_spl::associated_token::create(CpiContext::new_with_signer(
                        ctx.accounts.associated_token_program.to_account_info(),
                        associated_token_account_instruction,
                        &[],
                    ))?;
                }
            }

            let mut amount_in = params.amounts[k as usize];
            let amount_out_min = params.other_amounts_threshold[k as usize];

            total_amount_in += amount_in;
            total_amount_out_min += amount_out_min;

            if params.is_base_token_sol {
                let wsol_account = &token_accounts[0];
                let wsol_account_info = wsol_account.to_account_info();

                let wsol_mint = &token_mints[0];

                if wsol_mint.to_account_info().key
                    != &Pubkey::from_str("So11111111111111111111111111111111111111112").unwrap()
                {
                    return Err(ErrorCode::InvalidBaseTokenAccount.into());
                }

                // SOL to WSOL
                anchor_lang::system_program::transfer(
                    CpiContext::new(
                        ctx.accounts.system_program.to_account_info(),
                        anchor_lang::system_program::Transfer {
                            from: ctx.accounts.payer.to_account_info(),
                            to: wsol_account_info.clone(),
                        },
                    ),
                    amount_in,
                )?;

                sync_native(CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    SyncNative {
                        account: wsol_account_info.to_account_info(),
                    },
                ))?;
            }

            let mut swap_index = 0;

            for _ in 0..swap_len {
                let accounts = vec![
                    AccountMeta::new(ctx.accounts.payer.key(), true),
                    AccountMeta::new_readonly(amm_configs[swap_index].key(), false),
                    AccountMeta::new(pool_states[swap_index].key(), false),
                    AccountMeta::new(token_accounts[swap_index].key(), false),
                    AccountMeta::new(token_accounts[swap_index + 1].key(), false),
                    AccountMeta::new(token_vaults[2 * swap_index].key(), false),
                    AccountMeta::new(token_vaults[2 * swap_index + 1].key(), false),
                    AccountMeta::new(observation_states[swap_index].key(), false),
                    AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
                    AccountMeta::new_readonly(ctx.accounts.token_program_2022.key(), false),
                    AccountMeta::new_readonly(ctx.accounts.memo_program.key(), false),
                    AccountMeta::new_readonly(token_mints[swap_index].key(), false),
                    AccountMeta::new_readonly(token_mints[swap_index + 1].key(), false),
                ];

                let raydium_program = ctx.accounts.raydium_program.key();

                let swap_data = RaydiumSwapArgs {
                    amount: amount_in,
                    other_amount_threshold: 0,
                    sqrt_price_limit_x64: 0,
                    is_base_input: true,
                };

                let discriminator =
                    anchor_lang::solana_program::hash::hash("global:swap_v2".as_bytes()).to_bytes();

                let mut instruction_data = Vec::new();
                instruction_data.extend_from_slice(&discriminator[..8]);

                swap_data.serialize(&mut instruction_data)?;

                let mut accounts_with_remaining = accounts;

                accounts_with_remaining.push(AccountMeta::new(
                    other_accounts[3 * swap_index].key(),
                    false,
                ));
                accounts_with_remaining.push(AccountMeta::new(
                    other_accounts[3 * swap_index + 1].key(),
                    false,
                ));
                accounts_with_remaining.push(AccountMeta::new(
                    other_accounts[3 * swap_index + 2].key(),
                    false,
                ));

                let swap_ix = anchor_lang::solana_program::instruction::Instruction {
                    program_id: raydium_program,
                    accounts: accounts_with_remaining,
                    data: instruction_data.to_vec(),
                };

                let mut account_infos = vec![
                    ctx.accounts.payer.to_account_info(),
                    amm_configs[swap_index].to_account_info(),
                    pool_states[swap_index].to_account_info(),
                    token_accounts[swap_index].to_account_info(),
                    token_accounts[swap_index + 1].to_account_info(),
                    token_vaults[2 * swap_index].to_account_info(),
                    token_vaults[2 * swap_index + 1].to_account_info(),
                    observation_states[swap_index].to_account_info(),
                    ctx.accounts.token_program.to_account_info(),
                    ctx.accounts.token_program_2022.to_account_info(),
                    ctx.accounts.memo_program.to_account_info(),
                    token_mints[swap_index].to_account_info(),
                    token_mints[swap_index + 1].to_account_info(),
                ];

                account_infos.push(other_accounts[3 * swap_index].to_account_info());
                account_infos.push(other_accounts[3 * swap_index + 1].to_account_info());
                account_infos.push(other_accounts[3 * swap_index + 2].to_account_info());

                let balance_before =
                    Account::<TokenAccount>::try_from(&token_accounts[swap_index + 1])
                        .map_err(|_| ErrorCode::InvalidTokenAccount)?
                        .amount;

                anchor_lang::solana_program::program::invoke(&swap_ix, &account_infos)?;

                let balance_after =
                    Account::<TokenAccount>::try_from(&token_accounts[swap_index + 1])
                        .map_err(|_| ErrorCode::InvalidTokenAccount)?
                        .amount;

                amount_in = balance_after - balance_before;

                swap_index += 1;
            }

            total_amount_out += amount_in;

            if params.is_quote_token_sol {
                let wsol_account = &token_accounts[swap_len as usize];
                let wsol_account_info = wsol_account.to_account_info();

                let wsol_mint = &token_mints[swap_len as usize];

                if wsol_mint.to_account_info().key
                    != &Pubkey::from_str("So11111111111111111111111111111111111111112").unwrap()
                {
                    return Err(ErrorCode::InvalidQuoteTokenAccount.into());
                }

                if k == num_routes - 1 {
                    // WSOL to SOL
                    anchor_spl::token::close_account(CpiContext::new(
                        ctx.accounts.token_program.to_account_info(),
                        anchor_spl::token::CloseAccount {
                            account: wsol_account_info,
                            destination: ctx.accounts.payer.to_account_info(),
                            authority: ctx.accounts.payer.to_account_info(),
                        },
                    ))?;
                }
            }
        }

        require_gte!(
            total_amount_out,
            total_amount_out_min,
            ErrorCode::TooLittleOutputReceived
        );

        emit!(SwapEvent {
            amount_in: total_amount_in,
            amount_out: total_amount_out
        });

        Ok(())
    }
}

#[event]
pub struct SwapEvent {
    pub amount_in: u64,
    pub amount_out: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Too little received")]
    TooLittleOutputReceived,

    #[msg("Invalid token account")]
    InvalidTokenAccount,

    #[msg("Invalid base token account")]
    InvalidBaseTokenAccount,

    #[msg("Invalid quote token account")]
    InvalidQuoteTokenAccount,
}
