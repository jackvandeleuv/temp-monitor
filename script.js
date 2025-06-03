function cToF(c) {
    return (c * (9 / 5) + 32).toFixed(1);
}

function minutesAgoLabel(timestamp) {
    console.log(timestamp)
    const diffMs = Date.now() - new Date(timestamp * 1000).getTime();
    const minutes = Math.floor(diffMs / 60000); 

    if (minutes <= 0) return "just now";
    if (minutes === 1) return "1 minute ago";
    return `${minutes} minutes ago`;
}

function updateBackground(temp) {
  const min = 65;   
  const max = 85;     
  let ratio = (temp - min) / (max - min);
  ratio = Math.min(Math.max(ratio, 0), 1);   

  const start = { r: 0xd0, g: 0xe8, b: 0xff };
  const end   = { r: 0xff, g: 0xeb, b: 0xd2 }; 

  const r = Math.round(start.r + ratio * (end.r - start.r));
  const g = Math.round(start.g + ratio * (end.g - start.g));
  const b = Math.round(start.b + ratio * (end.b - start.b));

  document.body.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
}

function updateCurrentTemp(mostRecent) {
    document.getElementById('currentTemp').innerHTML = `Current: ${cToF(mostRecent.temperature)}&#176;`;
    document.getElementById('lastUpdateBox').innerText = `Last Updated: ${minutesAgoLabel(mostRecent.timestamp)}`;
    updateBackground(cToF(mostRecent.temperature));
}

function updateHighLowTemps(today) {
    const todayCopy = [...today];
    todayCopy.sort((a, b) => a.temperature - b.temperature);

    const high = cToF(todayCopy[todayCopy.length - 1].temperature);
    const low = cToF(todayCopy[0].temperature);

    document.getElementById('highTemp').innerHTML = `Daily High: ${high}&#176;`;
    document.getElementById('lowTemp').innerHTML = `Daily Low: ${low}&#176;`;
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

        const now = Date.now();
        const startToday = now - 24 * 60 * 60 * 1000;

        const today = data.filter(d => d.timestamp * 1000 >= startToday);
        today.sort((a, b) => a.timestamp - b.timestamp);

        const mostRecent = today[today.length - 1];

        updateCurrentTemp(mostRecent);
        // updateCurrentTemp({'timestamp': 1, 'temperature': 18})
        // updateCurrentTemp({'timestamp': 1, 'temperature': 180})
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
                tension: 0.3
            }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
            x: {
                ticks: {
                font: {
                    size: 16
                }
                },
                title: {
                display: true,
                text: 'Time',
                font: {
                    size: 18
                }
                }
            },
            y: {
                type: 'linear',
                position: 'left',
                ticks: {
                font: {
                    size: 16
                }
                },
                title: {
                display: true,
                text: 'Temperature (°F)',
                font: {
                    size: 18
                }
                }
            }
            },
            plugins: {
            legend: {
                position: 'top',
                labels: {
                font: {
                    size: 16
                }
                }
            }
            }
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