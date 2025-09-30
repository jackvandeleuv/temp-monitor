function cToF(c, decimals=1) {
    return (c * (9 / 5) + 32).toFixed(decimals);
}

function minutesAgoLabel(timestamp) {
    const diffMs = Date.now() - new Date(timestamp * 1000).getTime();
    const minutes = Math.floor(diffMs / 60000); 

    if (minutes <= 0) return "just now";
    if (minutes === 1) return "1 minute ago";
    return `${minutes} minutes ago`;
}

function tempToColor(t) {
    if (t < 61) return 'oklch(88.2% 0.059 254.128)'; 
    if (t < 64) return 'oklch(88.2% 0.059 254.128)'; 
    if (t < 67) return 'oklch(88.2% 0.059 254.128)'; 
    if (t < 69) return 'oklch(93.2% 0.032 255.585)'; 

    if (t < 75) return 'oklch(97% 0 0)'; 
    if (t < 78) return 'oklch(97% 0 0)';

    if (t < 81) return 'oklch(88.5% 0.062 18.334)';
    return 'oklch(80.8% 0.114 19.571)'; 
}

function tempToEmojis(temp) {
    if (temp < 61) {  // below 61
        return "💀"
    } else if (temp < 64) {  // 61 - 63
        return "🐧"
    } else if (temp < 67) {  // 64 - 66
        return "🥶"
    } else if (temp < 69) {  // 67 - 69
        return "😬"
    } else if (temp < 75) {  // 70 - 74
        return "😻"
    } else if (temp < 78) {  // 75 - 77
        return "😓"
    } else if (temp < 81) {  // 78 - 80
        return "🥵"
    } else if (temp < 84) {  // 81 - 83
        return "🐦‍🔥"
    } else {
        return "💀"  // 84 and above
    }
}

function updateCurrentTemp(mostRecentCube, mostRecentRoom) {
    const avgMostRecent = cToF((mostRecentCube.temperature + mostRecentRoom.temperature) / 2);

    document.getElementById('currentCubeTemp').innerHTML = `Cubicle: ${cToF(mostRecentCube.temperature, 0)}&#176;`;
    document.getElementById('currentRoomTemp').innerHTML = `Conference Room: ${cToF(mostRecentRoom.temperature, 0)}&#176;`;

    document.getElementById('lastUpdateBox').innerText = `Last Updated: ${minutesAgoLabel(mostRecentCube.timestamp)}`;

    const color = tempToColor(avgMostRecent);
    document.body.style.backgroundColor = color;
    document.getElementById('chart').style.backgroundColor = color;

    const emoji = tempToEmojis(avgMostRecent);
    document.getElementById('emoji').innerHTML = emoji;
    document.getElementById('headerLink').href = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${emoji}</text></svg>`;
}

function updateHighLowTemps(today) {
    const todayCopy = [...today];
    todayCopy.sort((a, b) => a.temperature - b.temperature);

    const high = cToF(todayCopy[todayCopy.length - 1].temperature, 0);
    const low = cToF(todayCopy[0].temperature, 0);

    const highBox = document.getElementById('highTemp');
    const lowBox = document.getElementById('lowTemp');
    
    highBox.innerHTML = `High: ${high}&#176;`;
    highBox.style.backgroundColor = tempToColor(high);

    lowBox.innerHTML = `Low: ${low}&#176;`;
    lowBox.style.backgroundColor = tempToColor(low);
}

function indicateFailure() {
    document.getElementById('emoji').innerHTML = "🙀";
    document.getElementById('currentCubeTemp').innerHTML = `(BLANK)`;
    document.getElementById('currentRoomTemp').innerHTML = `(BLANK)`;
    document.getElementById('highTemp').innerHTML = `(BLANK)`;
    document.getElementById('lowTemp').innerHTML = `(BLANK)`;
}

const makeChart = (ctx, labels, cubeData, cubeLabel, cubeColor, roomData, roomLabel, roomColor) => {
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: cubeLabel,
                    data: cubeData,
                    yAxisID: 'y',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.3,
                    borderColor: cubeColor,
                    backgroundColor: cubeColor
                },
                {
                    label: roomLabel,
                    data: roomData,
                    yAxisID: 'y',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.3,
                    borderColor: roomColor,
                    backgroundColor: roomColor
                },
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: null
            },
            plugins: {
                tooltip: {
                    enabled: false
                },
                legend: {
                    position: 'top',
                    labels: {
                        font: {
                            size: 14
                        },
                        color: 'black'
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        font: {
                            size: 24
                        },
                        color: 'black'
                    },
                    title: {
                        display: true,
                        text: 'Time',
                        font: {
                            size: 24
                        },
                        color: 'black'
                    }
                },
                y: {
                    type: 'linear',
                    position: 'left',
                    ticks: {
                        font: {
                            size: 24
                        },
                        color: 'black'
                    },
                    title: {
                        display: true,
                        text: 'Temperature (°F)',
                        font: {
                            size: 24
                        },
                        color: 'black'
                    }
                }
            },
            events: []
        }
    });
}

async function main() {
    ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6aWd2cWZhZHd1a2Rrc3NvY2ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5ODA2MTYsImV4cCI6MjA2NDU1NjYxNn0.5txdBRGZcwFNndwGwV0jsRY5C1MvdArypPpCg0QOxTU';

    try {
        const RPC_URL = `https://pzigvqfadwukdkssocfh.supabase.co/rest/v1/rpc/readings_agg`;
        const headers = {
            apikey: ANON_KEY,
            Authorization: `Bearer ${ANON_KEY}`,
            'Content-Type': 'application/json',
        };
        const body = JSON.stringify({
            _start_time: Math.round((Date.now() / 1000) - 3600 * 24),
            _end_time:   Math.round(Date.now() / 1000)
        });

        const response = await fetch(RPC_URL, {
            method: 'POST',
            headers,
            body
        });
        const responseJSON = await response.json();

        const data = responseJSON.map((obj) => (
            {
                temperature: obj.avg_temperature, 
                timestamp: Math.round(Number(new Date(obj.bucket_start)) / 1000),
                monitor_id: obj.monitor_id
            }
        ));

        if (data.length === 0) throw new Error('The temperature tracker is experiencing an outage. Please do not panic.');

        data.sort((a, b) => a.timestamp - b.timestamp);

        const CUBE_ID = 'D4:0E:86:46:5C:60';
        const ROOM_ID = 'D4:0E:86:46:03:40';

        const cubeData = data.filter((x) => x.monitor_id === CUBE_ID);
        const roomData = data.filter((x) => x.monitor_id === ROOM_ID);

        const mostRecentCube = cubeData[cubeData.length - 1];
        const mostRecentRoom = roomData[roomData.length - 1];

        updateCurrentTemp(mostRecentCube, mostRecentRoom);
        updateHighLowTemps(data);

        const cubeTemps = cubeData.map((c) => cToF(c.temperature));
        const roomTemps = roomData.map((c) => cToF(c.temperature));

        const TIME_BUCKET = 20 * 60;
        const labels = cubeData.map((d) => (
            new Date(
                Math.floor(d.timestamp / TIME_BUCKET) * TIME_BUCKET * 1000
            ).toLocaleTimeString(
                [], { hour: '2-digit', minute: '2-digit' }
            )
        ));

        const ctx = document.getElementById('chart').getContext('2d');

        return makeChart(
            ctx, 
            labels,
            cubeTemps, 
            'Cubicle', 
            'oklch(44.6% 0.043 257.281)', 
            roomTemps, 
            'Conference Room', 
            'oklch(51.1% 0.096 186.391)'
        )
    } catch (err) {
        document.body.insertAdjacentHTML(
            'beforeend',
            `<p style="color:red;margin-top:1rem;">${err.message}</p>`
        );
        console.error(err);
    }
}

main();
