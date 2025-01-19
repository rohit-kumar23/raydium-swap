import base64
import struct
import hashlib

event_base64 = "QMbN6CYIceIAypo7AAAAAD233tXZAAAA"

event_bytes = base64.b64decode(event_base64)

event_discriminator = event_bytes[:8]

event_name = "event:SwapEvent"
expected_discriminator = hashlib.sha256(event_name.encode('utf-8')).digest()[:8]

if event_discriminator == expected_discriminator:
    print("Discriminator matches! The event is valid.")
else:
    print("Discriminator mismatch! The event may not be valid.")

try:
    amount_in, amount_out = struct.unpack("<QQ", event_bytes[8:])
    print(f"Amount In: {amount_in}")
    print(f"Amount Out: {amount_out}")
except struct.error as e:
    print(f"Struct unpacking failed: {e}")
