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

print((payer.pubkey().__str__()))


def private_key_to_int_list(private_key: str) -> list:
    """
    Converts a string private key into a list of integer bytes.

    Args:
        private_key (str): The private key as a string.

    Returns:
        list: A list of integer bytes.
    """
    # Decode the private key from a string (e.g., hex or base58) to bytes
    # Example assumes hex-encoded string, adjust as needed for other formats
    import base58
    key_bytes = base58.b58decode(private_key)

    return list(key_bytes)

private_key = "3aAK8oqZwMqW4uQoRvgu61xh8QzHVbwWWsusEbDsrw1o4eCh5rXE3RSWoFg4xSz79s5BB8EYDJBiZoTf4bp9PGVE"  # Example hex-encoded private key
int_list = private_key_to_int_list(private_key)
print(int_list)


# 0.24390111 SOL
