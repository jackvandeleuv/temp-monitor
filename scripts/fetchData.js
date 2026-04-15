import { ANON_KEY } from "./config.js"

export async function getData(startUnix, endUnix, bucketSizeMins) {
    const RPC_URL = `https://pzigvqfadwukdkssocfh.supabase.co/rest/v1/rpc/readings_bucketed`;
    const headers = {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
    };

    const body = JSON.stringify({
        _start_time: startUnix,
        _end_time: endUnix,
        _bucket_size_mins: bucketSizeMins,
    });

    const response = await fetch(RPC_URL, {
        method: 'POST',
        headers,
        body
    });

    return await response.json();
}

export async function getMostRecentTimestamp() {
    const RPC_URL = `https://pzigvqfadwukdkssocfh.supabase.co/rest/v1/rpc/max_timestamp`;
    const headers = {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
    };

    const response = await fetch(RPC_URL, {
        method: 'POST',
        headers,
    });

    return await response.json();
}