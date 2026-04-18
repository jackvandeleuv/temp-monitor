const TEST = 63;

import { BUCKET_SIZE_MINS, CUBE_ID, DATA_PULL_FREQUENCY_MS, HOURS_OF_DATA, LAST_UPDATED_FREQUENCY_MS, ROOM_ID } from "./config.js";
import { getData, getMostRecentTimestamp } from "./fetchData.js";
import { dewPointToEmojis, tempToBucketed, tempToColor, tempToEmojis, tempToEmojisMap } from "./tempBuckets.js";

function datetimeToDisplay(datetime) {
    const hour = datetime.getHours();
    const dateString = datetime.toISOString().split('T')[0];    
    
    if (hour === 0) {
        return `12AM`
    } else if (hour === 12) {
        return `12PM`
    } else if (hour < 12) {
        return `${hour}AM`
    } else {
        return `${hour - 12}PM`
    }
}

function getMetricFromRow(option) {
    const choice = getMetricOptionState();
    if (choice === 'dewPoint') {
        return option.avg_dew_point.toFixed(1);
    } else if (choice === 'humidity') {
        return option.avg_humidity.toFixed(1);
    } else {
        return option.avg_temp.toFixed(1);
    }
}

function imputeDataMakeLabels(data) {
    // Calculate diffs in the timestamps so we can see if 
    // there are gaps we need to fill in.
    const diffsInMins = [];
    for (let i = 0; i < data.length - 1; i++) {
        diffsInMins.push(
            (
                data[i + 1].bucket_start_unix - data[i].bucket_start_unix
            ) / (1000 * 60)
        )
    }

    const labels = [];
    const dataOut = [];
    for (let i = 0; i < data.length; i++) {
        let diffInMins = diffsInMins[i];
        const row = data[i];

        labels.push(datetimeToDisplay(row.bucket_start));
        dataOut.push(getMetricFromRow(row));

        if (diffInMins <= BUCKET_SIZE_MINS) continue;

        let curUnix = row.bucket_start_unix;

        while (diffInMins > BUCKET_SIZE_MINS) {
            diffInMins -= BUCKET_SIZE_MINS;
            curUnix += (BUCKET_SIZE_MINS * 1000 * 60);
            labels.push(datetimeToDisplay(new Date(curUnix)));
            dataOut.push(null);
        }
    }

    return {
        data: dataOut,
        labels: labels
    };
}

function addMetricSelectionListener() {
    const elem = document.getElementById('metric');
    elem.addEventListener('change', (() => {
        setMetricOptionState(elem.value);
        renderFetchedData();
    }))
}

function getNearestTempBucket(temp) {
    const avgTemp = Math.round(temp);

    // Exclude the actual closest temp, as the goal
    // is to show the closest threshold we haven't hit yet.
    const actualBucket = tempToBucketed(temp);
    console.log(actualBucket)
    const thresholds = [...tempToEmojisMap.keys()]
        .filter((x) => x !== actualBucket)
        .sort();

    console.log(thresholds)

    const diffs = [];
    for (let i = 0; i < thresholds.length; i++) {
        diffs.push([thresholds[i], Math.abs(thresholds[i] - avgTemp)]);
    }
    diffs.sort((a, b) => b[1] - a[1]);
    
    return diffs.pop()[0];
}

function makeLineSpec() {
    const display = getMetricOptionState() === 'tempF';

    const avgTemp = getAvgCurrentTemp();
    const nearestBucketTemp = getNearestTempBucket(avgTemp);
    const nearestBucketEmoji = tempToEmojis(nearestBucketTemp);

    const yAdjust = avgTemp < nearestBucketTemp ? 25 : 0;
    // const arrow = avgTemp < nearestBucketTemp ? '⬆️' : '⬇️';

    return {
        display: display,
        type: 'line',
        borderWidth: 1,
        borderColor: 'black',
        yMin: nearestBucketTemp,
        yMax: nearestBucketTemp,
        label: {
            display: true,
            content: nearestBucketEmoji,
            position: 'end',
            font: {
                size: 40,
            },
            backgroundColor: 'transparent',
            yAdjust: yAdjust,
        },
    }
}

function renderChart(room, cube) {
    const datasets = [
        {
            label: 'Cubicle',
            // data: cube.data,
            data: [
                TEST, TEST + 1.3, 
                TEST - 1, TEST + 1.2, 
                TEST - 1.1, TEST + 3, 
                TEST, TEST + 4, 
                TEST - 1.1, TEST + 1, 
                TEST - 1, TEST + 1, 
                TEST - 1, TEST + 1, 
                TEST - 1, TEST + 1, 
                TEST +1, TEST + 1, 
                TEST +1, TEST + 4, 
                TEST - 1, TEST + 5, 
                TEST - 1, TEST + 1, 
                TEST - 1, TEST + 1, 

            ],
            borderWidth: 2,
            borderColor: "black",
            backgroundColor: "black"
        },
        // {
        //     label: 'Conference Room',
        //     data: room.data,
        //     borderWidth: 2,
        //     borderDash: [6, 6],
        //     borderColor: "black",
        // },
    ];

    if (getChartObj()) {
        const chart = getChartObj();
        chart.data.datasets = datasets;
        chart.data.labels = room.labels;
        chart.options.scales.y.title.text = getChoiceDisplayLabel();
        chart.options.plugins.annotation.annotations.constLine = makeLineSpec();
        chart.update();
        return;
    }

    const ctx = document.getElementById('chart');

    const chartSpec = {
        type: 'line',
        data: {
            labels: room.labels,
            datasets: datasets
        },
        options: {
            plugins: {
                annotation: {
                    annotations: {
                        constLine: makeLineSpec(),
                    }
                }
            },
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: false,
                    },
                    ticks: {
                        color: 'black',
                        font: {
                            size: 16,
                        }
                    }
                },

                y: {
                    title: {
                        text: getChoiceDisplayLabel(),
                        display: true,
                        color: 'black',
                        font: {
                            size: 16,
                        }
                    },
                    ticks: {
                        color: 'black',
                        font: {
                            size: 16,
                        }
                    }
                }
            }
        }
    };

    const chart = new Chart(ctx, chartSpec);

    setChartObj(chart);
}

function getChoiceDisplayLabel() {
    const choice = getMetricOptionState();
    if (choice === 'dewPoint') {
        return 'Dew Point (°F)'
    } else if (choice === 'humidity') {
        return 'Humidity (%)'
    } else {
        return 'Temperature (°F)'
    }
}

function cToF(c) {
    return (c * (9 / 5)) + 32;
}

function dewPoint(tempC, humidity) {
    const rh = humidity / 100;

    const A = 17.27;
    const H = 237.7;

    const gamma = (A * tempC) / (H + tempC) + Math.log(rh);
    const dewPointC = (H * gamma) / (A - gamma);

    return dewPointC;
}

function cleanData(data) {
    return [...data]
        .map((row) => ({
            bucket_start: new Date(row.bucket_start),
            bucket_start_unix: Number(new Date(row.bucket_start)),
            avg_temp: cToF(row.sum_temperature / row.temperature_obs),
            monitor_id: row.monitor_id,
            avg_humidity: row.sum_humidity / row.humidity_obs,
            avg_dew_point: cToF(dewPoint(
                row.sum_temperature / row.temperature_obs,
                row.sum_humidity / row.humidity_obs
            ))
        }))
        .sort((a, b) => a.bucket_start - b.bucket_start)
}

function updateDewMessage() {
    const wrapper = document.createElement('div');
    wrapper.id = 'dewMessageWrapper';

    const message = document.createElement('p');
    message.id = 'dewMessage';
    message.innerText = '💡 Dew Point is a combined measure of heat and humidity.';

    wrapper.appendChild(message);

    const choice = getMetricOptionState();
    if (choice === 'dewPoint') {
        const sibling = document.getElementById('selectBox');
        sibling.parentNode.insertBefore(wrapper, sibling.nextSibling);
    } else {
        const wrapper = document.getElementById('dewMessageWrapper');
        if (wrapper) wrapper.remove();
    }
}

function updatedLastUpdated() {
    const lastDataUpdateMilli = getLastDataUpdateTimestamp();
    const lastPullMilli = getLastPullTimestamp();

    const lastUpdateMilli = Math.min(lastDataUpdateMilli, lastPullMilli);

    document.getElementById('lastUpdatedVal').innerHTML = minutesAgoLabel(lastUpdateMilli);
}

function minutesAgoLabel(timestamp) {
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diffMs / 60000); 

    if (minutes <= 1) return "<1 mins ago.";
    if (minutes <= 2) return "2 mins ago.";
    if (minutes <= 3) return "3 mins ago.";
    if (minutes <= 5) return "5 mins ago.";
    if (minutes <= 10) return "10 mins ago.";
    if (minutes <= 30) return "30 mins ago.";
    if (minutes <= 60) return "1 hour ago.";
    return `>1 hour ago`;
}

function getAvgCurrentDewPoint() {
    const data = getChartDataState();

    const cube_row = data
        .filter((row) => row.monitor_id === CUBE_ID)
        .sort((a, b) => a.bucket_start_unix - b.bucket_start_unix)
        .pop();

    const room_row = data
        .filter((row) => row.monitor_id === ROOM_ID)
        .sort((a, b) => a.bucket_start_unix - b.bucket_start_unix)
        .pop();

    return (cube_row.avg_dew_point + room_row.avg_dew_point) / 2;
}

function getAvgCurrentTemp() {
    return TEST;

    const data = getChartDataState();

    const cube_row = data
        .filter((row) => row.monitor_id === CUBE_ID)
        .sort((a, b) => a.bucket_start_unix - b.bucket_start_unix)
        .pop();

    const room_row = data
        .filter((row) => row.monitor_id === ROOM_ID)
        .sort((a, b) => a.bucket_start_unix - b.bucket_start_unix)
        .pop();

    return (cube_row.avg_temp + room_row.avg_temp) / 2;
}

function updateStyle() {
    // Dew point based
    const avgDewPoint = getAvgCurrentDewPoint();

    const dewEmoji = dewPointToEmojis(avgDewPoint);
    document.getElementById('dewEmoji').innerHTML = dewEmoji;
    document.getElementById('headerLink').href = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${dewEmoji}</text></svg>`;

    // Temp based
    const avgTemp = getAvgCurrentTemp();

    const color = tempToColor(avgTemp);
    document.body.style.backgroundColor = color;
    document.getElementById('chart').style.backgroundColor = color;

    const tempEmoji = tempToEmojis(avgTemp);
    document.getElementById('tempEmoji').innerHTML = tempEmoji;
}

function updateStatBoxes() {
    const data = getChartDataState();

    const cube_row = data
        .filter((row) => row.monitor_id === CUBE_ID)
        .sort((a, b) => a.bucket_start_unix - b.bucket_start_unix)
        .pop();

    const room_row = data
        .filter((row) => row.monitor_id === ROOM_ID)
        .sort((a, b) => a.bucket_start_unix - b.bucket_start_unix)
        .pop();

    const humidity = (cube_row.avg_humidity + room_row.avg_humidity) / 2;
    const temp = (cube_row.avg_temp + room_row.avg_temp) / 2;
    const dew = (cube_row.avg_dew_point + room_row.avg_dew_point) / 2;

    document.getElementById('temp').innerHTML = Math.round(temp);
    document.getElementById('dewPoint').innerHTML = Math.round(dew);
    document.getElementById('humidity').innerHTML = Math.round(humidity);

}

function renderFetchedData() {
    updatedLastUpdated();

    const data = getChartDataState();

    let room = data.filter((row) => row.monitor_id === ROOM_ID);
    room = imputeDataMakeLabels(room);

    let cube = data.filter((row) => row.monitor_id === CUBE_ID);
    cube = imputeDataMakeLabels(cube);

    renderChart(room, cube);

    // updateDewMessage();
    updateStyle();
    updateStatBoxes();
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function loadData() {
    const secondsOfData = HOURS_OF_DATA * (60 * 60);
    const startUnix = Math.round((Date.now() / 1000) - secondsOfData);
    const endUnix = Math.round(Date.now() / 1000);

    const mostRecentTimestampPromise = getMostRecentTimestamp();
    let uncleanData = await getData(startUnix, endUnix, BUCKET_SIZE_MINS);
    setLastPullTimestamp(Date.now());

    // TEST
    // uncleanData = uncleanData.filter((row) => 
    //     (new Date(row.bucket_start)).getHours() !== 9
    // );

    const data = cleanData(uncleanData);
    setChartDataState(data);

    const mostRecentTimestamp = (await mostRecentTimestampPromise).pop().max_timestamp;
    setLastDataUpdateTimestamp(mostRecentTimestamp * 1000);
}

async function getUpdatedDataLoop() {
    while (true) {
        // Pull new data on a set interval.
        await sleep(DATA_PULL_FREQUENCY_MS);
        await loadData();
        renderFetchedData();
    }
}

async function updateDisplayTimestampLoop() {
    while (true) {
        // Check the last time the data was updated.
        await sleep(LAST_UPDATED_FREQUENCY_MS);
        updatedLastUpdated();
    }
}

function loadingOn() {
    const chart = document.getElementById('chart');
    chart.style.visibility = 'hidden';
    const wrapper = document.getElementById('loaderWrapper');
    wrapper.style.visibility = 'visible';
}

function loadingOff() {
    const wrapper = document.getElementById('loaderWrapper');
    wrapper.style.visibility = 'hidden';
    const chart = document.getElementById('chart');
    chart.style.visibility = 'visible';
}

async function main() {
    await loadData();

    renderFetchedData();
    
    updatedLastUpdated();

    addMetricSelectionListener();

    // Infinite loops.
    getUpdatedDataLoop();
    updateDisplayTimestampLoop();

    // For some reason this persists between page refreshes,
    // so we reset it here.
    document.getElementById("metric").value = "tempF";

    loadingOff();
}

function getMetricOptionState() {
    return structuredClone(metricOptionState);
}

function setChartDataState(update) {
    chartDataState = structuredClone(update);
}

function getChartDataState() {
    return structuredClone(chartDataState);
}

function setMetricOptionState(choice) {
    const VALID = ['dewPoint', 'humidity', 'tempF'];
    if (!VALID.includes(choice)) {
        throw new Error('Invalid metric option.');
    }
    metricOptionState = structuredClone(choice);
}

function setChartObj(chartObj) {
    chart = chartObj;
}

function getChartObj() {
    return chart;
}

function getLastDataUpdateTimestamp() {
    return structuredClone(lastDataUpdateTimestamp);
}

function setLastDataUpdateTimestamp(val) {
    lastDataUpdateTimestamp = structuredClone(val);
}

function getLastPullTimestamp() {
    return structuredClone(lastPullTimestamp);
}

function setLastPullTimestamp(val) {
    lastPullTimestamp = structuredClone(val);
}

let metricOptionState = 'tempF';
let chartDataState = null;
let chart = null;
let lastDataUpdateTimestamp = null;
let lastPullTimestamp = null;

main();
