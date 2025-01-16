from solana.rpc.api import Client
from solders.pubkey import Pubkey
from solders.keypair import Keypair
from solana.rpc.types import TxOpts
from solders.signature import Signature
from solana.transaction import Transaction
from solana.rpc.types import TokenAccountOpts
from solders.system_program import TransferParams, transfer
from spl.token.constants import TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID


pk = "45QgE5tq6gVWYPVGNxrKKXbf1qVLsbcPJENrGD49ocQGE2zzuFEfLHyTbwU84zJmjmj8rqvcUxUkmBtAgpJXoHUf"

payer = Keypair.from_base58_string(pk)

print(payer.pubkey())

