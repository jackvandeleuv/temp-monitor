import { CUBE_ID, ROOM_ID, ANON_KEY } from "./config.js"

async function fetchData() {
    const url = new URL(        'https://pzigvqfadwukdkssocfh.supabase.co/rest/v1/readings');
    url.searchParams.set('select', '*');
    url.searchParams.append('limit', '3');
    url.searchParams.append('temperature', 'eq.25.2');

    const headers = {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
    };

    const resp = await fetch(url,{ headers: headers });

    console.log(await resp.json())
}

fetchData()