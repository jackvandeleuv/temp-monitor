let chartInstance = null;
let chartData = {};

const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6aWd2cWZhZHd1a2Rrc3NvY2ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5ODA2MTYsImV4cCI6MjA2NDU1NjYxNn0.5txdBRGZcwFNndwGwV0jsRY5C1MvdArypPpCg0QOxTU';
const CUBE_ID = 'D4:0E:86:46:5C:60';
const ROOM_ID = 'D4:0E:86:46:03:40';

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
    const cubeTemp = mostRecentCube?.temperature;
    const roomTemp = mostRecentRoom?.temperature;

    // Calculate average from available data
    let avgMostRecent;
    if (cubeTemp != null && roomTemp != null) {
        avgMostRecent = cToF((cubeTemp + roomTemp) / 2);
    } else if (cubeTemp != null) {
        avgMostRecent = cToF(cubeTemp);
    } else if (roomTemp != null) {
        avgMostRecent = cToF(roomTemp);
    } else {
        avgMostRecent = 70; // fallback
    }

    document.getElementById('currentCubeTempVal').innerHTML = cubeTemp != null
        ? `${cToF(cubeTemp, 0)}&#176;` : '--';
    document.getElementById('currentRoomTempVal').innerHTML = roomTemp != null
        ? `${cToF(roomTemp, 0)}&#176;` : '--';

    const timestamp = mostRecentCube?.timestamp || mostRecentRoom?.timestamp;
    document.getElementById('lastUpdateBox').innerText = timestamp
        ? `Last Updated: ${minutesAgoLabel(timestamp)}` : 'Last Updated: --';

    const color = tempToColor(avgMostRecent);
    document.body.style.backgroundColor = color;
    document.getElementById('chart').style.backgroundColor = color;

    const emoji = tempToEmojis(avgMostRecent);
    document.getElementById('emoji').innerHTML = emoji;
    document.getElementById('headerLink').href = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${emoji}</text></svg>`;
}

function updateHighLowTemps(today) {
    if (!today || today.length === 0) {
        document.getElementById('highTempVal').innerHTML = '--';
        document.getElementById('lowTempVal').innerHTML = '--';
        return;
    }

    const todayCopy = [...today];
    todayCopy.sort((a, b) => a.temperature - b.temperature);

    const high = cToF(todayCopy[todayCopy.length - 1].temperature, 0);
    const low = cToF(todayCopy[0].temperature, 0);

    document.getElementById('highTempVal').innerHTML = `${high}&#176;`;
    document.getElementById('lowTempVal').innerHTML = `${low}&#176;`;
}

function indicateFailure() {
    document.getElementById('emoji').innerHTML = "🙀";
    document.getElementById('currentCubeTempVal').innerHTML = `(BLANK)`;
    document.getElementById('currentRoomTempVal').innerHTML = `(BLANK)`;
    document.getElementById('highTemp').innerHTML = `(BLANK)`;
    document.getElementById('lowTemp').innerHTML = `(BLANK)`;
}

function getDatasets(showTemp, showHumidity, showCubicle, showConfRoom) {
    const datasets = [];
    // Tailwind violet for temperature (neutral, not hot/cold associated)
    const cubeTempColor = '#7c3aed';      // violet-600
    const roomTempColor = '#a78bfa';      // violet-400
    // Tailwind sky for humidity
    const cubeHumidityColor = '#0284c7';  // sky-600
    const roomHumidityColor = '#38bdf8';  // sky-400

    if (showTemp && showCubicle) {
        datasets.push({
            label: 'Cubicle Temp',
            data: chartData.cubeTemps,
            yAxisID: 'y',
            borderWidth: 2,
            fill: false,
            tension: 0.3,
            borderColor: cubeTempColor,
            backgroundColor: cubeTempColor
        });
    }
    if (showTemp && showConfRoom) {
        datasets.push({
            label: 'Conf Room Temp',
            data: chartData.roomTemps,
            yAxisID: 'y',
            borderWidth: 2,
            fill: false,
            tension: 0.3,
            borderColor: roomTempColor,
            backgroundColor: roomTempColor
        });
    }

    if (showHumidity && showCubicle) {
        datasets.push({
            label: 'Cubicle Humidity',
            data: chartData.cubeHumidity,
            yAxisID: showTemp ? 'y1' : 'y',
            borderWidth: 2,
            fill: false,
            tension: 0.3,
            borderColor: cubeHumidityColor,
            backgroundColor: cubeHumidityColor
        });
    }
    if (showHumidity && showConfRoom) {
        datasets.push({
            label: 'Conf Room Humidity',
            data: chartData.roomHumidity,
            yAxisID: showTemp ? 'y1' : 'y',
            borderWidth: 2,
            fill: false,
            tension: 0.3,
            borderColor: roomHumidityColor,
            backgroundColor: roomHumidityColor
        });
    }

    return datasets;
}

function getScales(showTemp, showHumidity) {
    const axisColor = '#64748b'; // slate-500
    const scales = {
        x: {
            ticks: { font: { size: 10 }, color: axisColor }
        }
    };

    if (showTemp && !showHumidity) {
        scales.y = {
            type: 'linear',
            position: 'left',
            ticks: { font: { size: 10 }, color: axisColor },
            title: { display: true, text: 'Temperature (°F)', font: { size: 10 }, color: axisColor }
        };
    } else if (showHumidity && !showTemp) {
        scales.y = {
            type: 'linear',
            position: 'left',
            ticks: { font: { size: 10 }, color: axisColor },
            title: { display: true, text: 'Humidity (%)', font: { size: 10 }, color: axisColor }
        };
    } else if (showTemp && showHumidity) {
        scales.y = {
            type: 'linear',
            position: 'left',
            ticks: { font: { size: 10 }, color: axisColor },
            title: { display: true, text: 'Temperature (°F)', font: { size: 10 }, color: axisColor }
        };
        scales.y1 = {
            type: 'linear',
            position: 'right',
            ticks: { font: { size: 10 }, color: axisColor },
            title: { display: true, text: 'Humidity (%)', font: { size: 10 }, color: axisColor },
            grid: { drawOnChartArea: false }
        };
    }

    return scales;
}

function getChartOptions() {
    return {
        showTemp: document.getElementById('tempCheckbox').checked,
        showHumidity: document.getElementById('humidityCheckbox').checked,
        showCubicle: document.getElementById('cubicleCheckbox').checked,
        showConfRoom: document.getElementById('confRoomCheckbox').checked
    };
}

function updateChart() {
    if (!chartInstance) return;
    const { showTemp, showHumidity, showCubicle, showConfRoom } = getChartOptions();
    chartInstance.data.datasets = getDatasets(showTemp, showHumidity, showCubicle, showConfRoom);
    chartInstance.options.scales = getScales(showTemp, showHumidity);
    chartInstance.update();
}

const makeChart = (ctx, labels, showTemp, showHumidity, showCubicle, showConfRoom) => {
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: getDatasets(showTemp, showHumidity, showCubicle, showConfRoom)
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: null },
            plugins: {
                tooltip: { enabled: false },
                legend: {
                    position: 'top',
                    labels: {
                        font: { size: 10 },
                        color: '#334155',
                        boxWidth: 12,
                        padding: 8
                    }
                }
            },
            scales: getScales(showTemp, showHumidity),
            events: []
        }
    });
}

async function fetchData(hours) {
    const RPC_URL = `https://pzigvqfadwukdkssocfh.supabase.co/rest/v1/rpc/readings_sum_agg_humidity`;
    const headers = {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
    };
    const body = JSON.stringify({
        _start_time: Math.round((Date.now() / 1000) - 3600 * hours),
        _end_time:   Math.round(Date.now() / 1000)
    });

    const response = await fetch(RPC_URL, {
        method: 'POST',
        headers,
        body
    });
    if (!response.ok) throw new Error('Could not fetch temperature data.');

    const responseJSON = await response.json();

    // Keep sums and counts for proper weighted aggregation later
    const data = responseJSON.map((obj) => (
        {
            sum_temperature: obj.sum_temperature,
            sum_humidity: obj.sum_humidity,
            temperature_obs: obj.temperature_obs,
            humidity_obs: obj.humidity_obs,
            timestamp: Math.round(Number(new Date(obj.bucket_start)) / 1000),
            monitor_id: obj.monitor_id
        }
    ));

    if (data.length === 0) throw new Error('The temperature tracker is experiencing an outage. Please do not panic.');

    data.sort((a, b) => a.timestamp - b.timestamp);
    return data;
}

// Aggregate data into larger time buckets using weighted averages
function aggregateData(data, bucketSeconds) {
    const buckets = new Map();

    for (const row of data) {
        const bucketKey = `${row.monitor_id}_${Math.floor(row.timestamp / bucketSeconds) * bucketSeconds}`;

        if (!buckets.has(bucketKey)) {
            buckets.set(bucketKey, {
                sum_temperature: 0,
                sum_humidity: 0,
                temperature_obs: 0,
                humidity_obs: 0,
                timestamp: Math.floor(row.timestamp / bucketSeconds) * bucketSeconds,
                monitor_id: row.monitor_id
            });
        }

        const bucket = buckets.get(bucketKey);
        bucket.sum_temperature += row.sum_temperature;
        bucket.sum_humidity += row.sum_humidity;
        bucket.temperature_obs += row.temperature_obs;
        bucket.humidity_obs += row.humidity_obs;
    }

    // Convert to array and calculate final averages
    return Array.from(buckets.values())
        .map((b) => ({
            temperature: b.sum_temperature / b.temperature_obs,
            humidity: b.sum_humidity / b.humidity_obs,
            timestamp: b.timestamp,
            monitor_id: b.monitor_id
        }))
        .sort((a, b) => a.timestamp - b.timestamp);
}

// Time bucket constants (in seconds)
const BUCKET = {
    MINUTES_20: 20 * 60,
    HOURLY: 60 * 60,
    EVERY_3_HOURS: 3 * 60 * 60,
    EVERY_6_HOURS: 6 * 60 * 60,
    DAILY: 24 * 60 * 60,
    WEEKLY: 7 * 24 * 60 * 60
};

function formatTimestamp(timestamp, hours) {
    const date = new Date(timestamp * 1000);

    if (hours <= 24) {
        // Show time: "2:20 PM"
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } else if (hours <= 72) {
        // Show day + hour: "Mon 2 PM"
        const day = date.toLocaleDateString([], { weekday: 'short' });
        const hour = date.toLocaleTimeString([], { hour: 'numeric' });
        return `${day} ${hour}`;
    } else if (hours <= 168) {
        // Show day + hour: "Mon 2 PM"
        const day = date.toLocaleDateString([], { weekday: 'short' });
        const hour = date.toLocaleTimeString([], { hour: 'numeric' });
        return `${day} ${hour}`;
    } else if (hours <= 720) {
        // Show date: "Jan 15"
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } else if (hours <= 2160) {
        // Show date: "Jan 15"
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } else {
        // Show week: "Jan 15"
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
}

function getAggregationBucket(hours) {
    if (hours <= 24) {
        return BUCKET.MINUTES_20;    // ~72 points
    } else if (hours <= 72) {
        return BUCKET.HOURLY;        // ~72 points
    } else if (hours <= 168) {
        return BUCKET.EVERY_3_HOURS; // ~56 points
    } else if (hours <= 720) {
        return BUCKET.DAILY;         // ~30 points
    } else if (hours <= 2160) {
        return BUCKET.DAILY;         // ~90 points
    } else {
        return BUCKET.WEEKLY;        // ~52 points
    }
}

function processData(rawData, hours) {
    const bucket = getAggregationBucket(hours);

    // Calculate high/low from finest granularity data (before aggregation)
    // to preserve true extremes
    const fineData = aggregateData(rawData, BUCKET.MINUTES_20);
    updateHighLowTemps(fineData);

    // Aggregate data with proper weighted averages for chart display
    const data = aggregateData(rawData, bucket);

    const cubeData = data.filter((x) => x.monitor_id === CUBE_ID);
    const roomData = data.filter((x) => x.monitor_id === ROOM_ID);

    // For current temp, use most recent value
    const mostRecentCube = cubeData[cubeData.length - 1];
    const mostRecentRoom = roomData[roomData.length - 1];

    updateCurrentTemp(mostRecentCube, mostRecentRoom);

    // Create unified timestamp list from both datasets
    const allTimestamps = [...new Set([
        ...cubeData.map(d => d.timestamp),
        ...roomData.map(d => d.timestamp)
    ])].sort((a, b) => a - b);

    // Create lookup maps for quick access
    const cubeByTime = new Map(cubeData.map(d => [d.timestamp, d]));
    const roomByTime = new Map(roomData.map(d => [d.timestamp, d]));

    // Align data to unified timestamps (null for missing points)
    chartData.cubeTemps = allTimestamps.map(t => {
        const d = cubeByTime.get(t);
        return d ? cToF(d.temperature) : null;
    });
    chartData.roomTemps = allTimestamps.map(t => {
        const d = roomByTime.get(t);
        return d ? cToF(d.temperature) : null;
    });
    chartData.cubeHumidity = allTimestamps.map(t => {
        const d = cubeByTime.get(t);
        return d ? d.humidity : null;
    });
    chartData.roomHumidity = allTimestamps.map(t => {
        const d = roomByTime.get(t);
        return d ? d.humidity : null;
    });

    const labels = allTimestamps.map(t => formatTimestamp(t, hours));

    return labels;
}

async function loadData(hours) {
    try {
        const data = await fetchData(hours);
        const labels = processData(data, hours);

        const { showTemp, showHumidity, showCubicle, showConfRoom } = getChartOptions();

        if (chartInstance) {
            chartInstance.data.labels = labels;
            chartInstance.data.datasets = getDatasets(showTemp, showHumidity, showCubicle, showConfRoom);
            chartInstance.options.scales = getScales(showTemp, showHumidity);
            chartInstance.update();
        } else {
            const ctx = document.getElementById('chart').getContext('2d');
            chartInstance = makeChart(ctx, labels, showTemp, showHumidity, showCubicle, showConfRoom);
        }
    } catch (err) {
        document.body.insertAdjacentHTML(
            'beforeend',
            `<p style="color:red;margin-top:1rem;">${err.message}</p>`
        );
        console.error(err);
    }
}

async function main() {
    const dateRangeSelect = document.getElementById('dateRange');

    document.getElementById('tempCheckbox').addEventListener('change', updateChart);
    document.getElementById('humidityCheckbox').addEventListener('change', updateChart);
    document.getElementById('cubicleCheckbox').addEventListener('change', updateChart);
    document.getElementById('confRoomCheckbox').addEventListener('change', updateChart);
    dateRangeSelect.addEventListener('change', () => loadData(Number(dateRangeSelect.value)));

    await loadData(Number(dateRangeSelect.value));
}

main();
