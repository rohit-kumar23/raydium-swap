from solana.rpc.api import Client
from solders.pubkey import Pubkey
from solders.keypair import Keypair
from solana.rpc.types import TxOpts
from solders.signature import Signature
from solana.transaction import Transaction
from solana.rpc.types import TokenAccountOpts
from solders.instruction import Instruction, AccountMeta
from solders.system_program import TransferParams, transfer
from spl.token.constants import TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID ,ASSOCIATED_TOKEN_PROGRAM_ID



def get_associated_token_address(owner: Pubkey, mint: Pubkey, token_program: Pubkey) -> Pubkey:
    key, _ = Pubkey.find_program_address(
        seeds=[bytes(owner), bytes(token_program), bytes(mint)],
        program_id=ASSOCIATED_TOKEN_PROGRAM_ID,
    )
    return key.__str__()

payer = Pubkey.from_string("Zivon5h5wAjQS8NTnApXjs8mrq8WBP5EnpVn6h2mcFA")
token_mint_pubkey = Pubkey.from_string("So11111111111111111111111111111111111111112")
token_program_pubkey = Pubkey.from_string("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")


print(get_associated_token_address(payer, token_mint_pubkey, token_program_pubkey))

