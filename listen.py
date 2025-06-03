import asyncio
from bleak import BleakScanner
import time
import requests
import os
from dotenv import load_dotenv

load_dotenv()

def decode(encoded: bytes):
    base = int.from_bytes(encoded[2 : 5], "big")

    if base & 0x800000:
        base &= 0x7FFFFF 
        sign = -1
    else:
        sign = 1

    temp = sign * ((base // 1000) / 10.0) 
    humidity = (base % 1000) / 10.0         

    return temp, humidity

async def insert_into_supabase(row):
    API_KEY = os.getenv("SUPABASE_CLIENT_ANON_KEY")
    URL = os.getenv("SUPABASE_URL")

    headers = {
        "apikey": API_KEY,
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

    response = requests.post(URL, json=row, headers=headers, timeout=6)
    response.raise_for_status()

def detect(device, adv):
    try:
        DEVICE_ID = os.environ['DEVICE_ID']
        if DEVICE_ID not in str(device):
            return
        encoded = adv.manufacturer_data[1]
        temp, humidity = decode(encoded)
        asyncio.run(
            insert_into_supabase({
                'temperature': temp,
                'humidity': humidity,
                'reading_timestamp': time.time()
            })
        )
    except Exception as e:
        print(f'\nDetect failure at {time.time()}. Error message:')
        print(e)

async def main():
    scanner = BleakScanner(detect)
    await scanner.start()
    try:
        while True:
            await asyncio.sleep(10)
    finally:
        await scanner.stop()

if __name__ == "__main__":
    asyncio.run(main())
