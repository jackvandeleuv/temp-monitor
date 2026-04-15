import asyncio
from bleak import BleakScanner
import json
import time
import base64
import requests
import os
from dotenv import load_dotenv
from collections import defaultdict

load_dotenv()
last_push = time.time()

SECRET_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
SUPABASE_URI = os.environ["SUPABASE_URI"]

HEADERS = {
    "apikey": SECRET_KEY,
    "Authorization": f"Bearer {SECRET_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

def post(row):
    r = requests.post(SUPABASE_URI, json=row, headers=HEADERS)
    r.raise_for_status() 

def log_failure(e, location):
    print(f'Detect failure at {time.time()}.\nThrown by: {location}.\nError message:')
    print(e)

def current_sha(api, headers):
    try:
        r = requests.get(api, headers=headers)
        return r.json()["sha"] if r.status_code == 200 else None
    except Exception as e:
        log_failure(e, "current_sha")

def decode(encoded: bytes):
    try:
        base = int.from_bytes(encoded[2 : 5], "big")

        if base & 0x800000:
            base &= 0x7FFFFF 
            sign = -1
        else:
            sign = 1

        temp = sign * ((base // 1000) / 10.0) 
        humidity = (base % 1000) / 10.0    

        return temp, humidity
    except Exception as e:
        log_failure(e, "decode")

def detect(device, adv):
    global cube_measurements, conference_room_measurements
    FRACTION_TO_POST = 20
    
    try:
        CUBE_DEVICE_ID = os.environ['CUBE_DEVICE_ID']
        CONFERENCE_ROOM_DEVICE_ID = os.environ['CONFERENCE_ROOM_DEVICE_ID']

        if device.address not in (CUBE_DEVICE_ID, CONFERENCE_ROOM_DEVICE_ID):
            return 

        if device.address == CUBE_DEVICE_ID:
            cube_measurements += 1
            if cube_measurements % FRACTION_TO_POST != 0:
                return
            
        if device.address == CONFERENCE_ROOM_DEVICE_ID:
            conference_room_measurements += 1
            if conference_room_measurements % FRACTION_TO_POST != 0:
                return

        encoded = adv.manufacturer_data[1]  # Key in the dict is 1.
        temp, humidity = decode(encoded)

        post({
            'temperature': temp,
            'humidity': humidity,
            'timestamp': time.time(),
            'monitor_id': device.address
        })

    except Exception as e:
        log_failure(e, "detect")

async def main():
    scanner = BleakScanner(detect)
    await scanner.start()
    try:
        while True:
            await asyncio.sleep(10)
    finally:
        await scanner.stop()

cube_measurements = 0
conference_room_measurements = 0
if __name__ == "__main__":
    asyncio.run(main())
