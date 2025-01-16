from solana.rpc.api import Client
from solders.pubkey import Pubkey
from solders.keypair import Keypair

wallet_address = "2qhv3WvZkB4sLc6k31Vt1o2E9YnnKSAdEwodZAv4FJnX"
wallet_key = "45QgE5tq6gVWYPVGNxrKKXbf1qVLsbcPJENrGD49ocQGE2zzuFEfLHyTbwU84zJmjmj8rqvcUxUkmBtAgpJXoHUf"

_web3RpcUrl = 'https://api.mainnet-beta.solana.com'

client = Client(_web3RpcUrl)
sol_balance = client.get_balance(Pubkey.from_string(wallet_address))

print(sol_balance)

payer = Keypair.from_base58_string(wallet_key)

print(payer.pubkey())
