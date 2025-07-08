function cToF(c, decimals=1) {
    return (c * (9 / 5) + 32).toFixed(decimals);
}

function minutesAgoLabel(timestamp) {
    console.log(timestamp)
    const diffMs = Date.now() - new Date(timestamp * 1000).getTime();
    const minutes = Math.floor(diffMs / 60000); 

    if (minutes <= 0) return "just now";
    if (minutes === 1) return "1 minute ago";
    return `${minutes} minutes ago`;
}

function tempToColor(temp) {
    const min = 65;   
    const max = 85;     
    let ratio = (temp - min) / (max - min);
    ratio = Math.min(Math.max(ratio, 0), 1);   

    const start = { r: 0xd0, g: 0xe8, b: 0xff };
    const end   = { r: 0xff, g: 0xeb, b: 0xd2 }; 

    const r = Math.round(start.r + ratio * (end.r - start.r));
    const g = Math.round(start.g + ratio * (end.g - start.g));
    const b = Math.round(start.b + ratio * (end.b - start.b));

    return `rgb(${r}, ${g}, ${b})`;
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

function updateCurrentTemp(mostRecent) {
    console.log(tempToEmojis(cToF(mostRecent.temperature)))
    document.getElementById('currentTemp').innerHTML = `Current: ${cToF(mostRecent.temperature, 0)}&#176;`;
    document.getElementById('lastUpdateBox').innerText = `Last Updated: ${minutesAgoLabel(mostRecent.timestamp)}`;
    document.body.style.backgroundColor = tempToColor(cToF(mostRecent.temperature));
    document.getElementById('emoji').innerHTML = tempToEmojis(cToF(mostRecent.temperature));
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
    document.getElementById('currentTemp').innerHTML = `Current: (BLANK)`;
    document.getElementById('emoji').innerHTML = "🙀";

    // document.getElementById('highTemp').innerHTML = `High: -`;
    // document.getElementById('lowTemp').innerHTML = `Low: `;
}

(async () => {
    const ctx = document.getElementById('chart').getContext('2d');
    const FILENAME = 'https://raw.githubusercontent.com/jackvandeleuv/temp-monitor-data/refs/heads/main/auto_temp_data.jsonl';
    let chart;

    try {
        const response = await fetch(FILENAME);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = await response.text();

        const lines = text.trim().split(/\n+/);
        let data = lines.map(line => JSON.parse(line));
        if (data.length === 0) throw new Error('No data points in the last 24\u202Fhours');

        data.sort((a, b) => a.timestamp - b.timestamp);

        const mostRecent = data[data.length - 1];
        const now = Date.now();

        if ((now - mostRecent.timestamp) > 3600) {
            indicateFailure();
            throw new Error('The temperature tracker is experiencing an outage. Please do not panic.');
        }

        const startToday = now - 24 * 60 * 60 * 1000;
        const today = data.filter(d => d.timestamp * 1000 >= startToday);

        updateCurrentTemp(mostRecent);
        updateHighLowTemps(today);

        const todayTemp = today.map((c) => cToF(c.temperature));

        const labels = today.map((d) => (
            new Date(
                Math.floor(d.timestamp / 1800) * 1800 * 1000
            ).toLocaleTimeString(
                [], { hour: '2-digit', minute: '2-digit' }
            )
        ));

        if (chart) chart.destroy();

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                {
                    label: 'Temperature (°F)',
                    data: todayTemp,
                    yAxisID: 'y',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.3,
                    borderColor: 'black'
                }
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
                        size: 24
                    }
                    }
                }
                },
                scales: {
                x: {
                    ticks: {
                    font: {
                        size: 24
                    }
                    },
                    title: {
                    display: true,
                    text: 'Time',
                    font: {
                        size: 24
                    }
                    }
                },
                y: {
                    type: 'linear',
                    position: 'left',
                    ticks: {
                    font: {
                        size: 24
                    }
                    },
                    title: {
                    display: true,
                    text: 'Temperature',
                    font: {
                        size: 24
                    }
                    }
                }
                },
                events: []
            }
        });

    } catch (err) {
        document.body.insertAdjacentHTML(
            'beforeend',
            `<p style="color:red;margin-top:1rem;">Failed to load <strong>${FILENAME}</strong>: ${err.message}</p>`
        );
        console.error(err);
        }
}) ();