import hashlib

# Function to calculate the discriminator
def calculate_discriminator(input_string):
    # Compute the SHA-256 hash of the input string
    hash_bytes = hashlib.sha256(input_string.encode('utf-8')).digest()
    # Return the first 8 bytes
    return hash_bytes[:8]

# Input string
input_string = "global:swap"

# Calculate the discriminator
discriminator = calculate_discriminator(input_string)

# Print the first 8 bytes in hexadecimal format
print(discriminator.hex())


print(len(b'\xf8\xc6\x9e\x91\xe1u\x87\xc8\x01\x00\x00\x00\x00\x00\x00\x00@KL\x00\x00\x00\x00\x00qH\x10\x00\x00\x00\x00\x00\x01\x00'.hex()))

print(len("f8c69e91e17587c801000000000000006400000000000000f4010000000000000001"))
