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

def log_failure(e):
    print('Detect failure.')
    print(time.time())
    print(e)

def send_data():
    token = os.environ['GH_TOKEN']
    owner = "jackvandeleuv"
    repo = "temp-monitor-data"
    path = "auto_temp_data.jsonl"
    api = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json"
    }

    temps = defaultdict(list)
    humidities = defaultdict(list)
    with open(f"temp_data_local.jsonl", "rt") as file:
        for line in file:
            row = json.loads(line)
            key = (row['timestamp'] // 1800) * 1800  # Bucket every 30 minutes.
            temps[key].append(row['temperature'])
            humidities[key].append(row['humidity'])

    temp_data = []
    for timestamp in temps:
        temp_data.append({
            'timestamp': timestamp,
            'temperature': sum(temps[timestamp]) / len(temps[timestamp]),
            'humidity': sum(humidities[timestamp]) / len(humidities[timestamp])
        })

    with open("temp_data_local_agg.jsonl", "w") as file:
        for row in temp_data:
            file.write(json.dumps(row) + '\n')
            
    with open(f"temp_data_local_agg.jsonl", "rb") as file:
        push(file.read(), api, headers)

def current_sha(api, headers):
    r = requests.get(api, headers=headers)
    return r.json()["sha"] if r.status_code == 200 else None

def push(blob: bytes, api, headers):
    body = {
        "message": f"data {time.strftime('%F %T', time.gmtime())}",
        "content": base64.b64encode(blob).decode(),
    }
    sha = current_sha(api, headers)
    if sha: body["sha"] = sha
    r = requests.put(api, headers=headers, data=json.dumps(body))
    try:
        r.raise_for_status()
    except Exception as e:
        print(f'\nPush failure at {time.time()}. Error is:')
        print(e)

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


def detect(device, adv):
    try:
        DEVICE_ID = os.environ['DEVICE_ID']
        if DEVICE_ID in str(device):
            encoded = adv.manufacturer_data[1]
            temp, humidity = decode(encoded)
            with open(f'temp_data_local.jsonl', 'a', encoding='utf-8') as file:
                file.write(json.dumps({
                    'temperature': temp,
                    'humidity': humidity,
                    'timestamp': time.time()
                }) + '\n')
            global last_push
            secs_since_last_push = time.time() - last_push
            if secs_since_last_push > 300:
                send_data()
                last_push = time.time()
    except Exception as e:
        log_failure(e)

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
