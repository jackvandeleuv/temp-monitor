import { BUCKET_SIZE_MINS, CUBE_ID, DATA_PULL_FREQUENCY_MS, HOURS_OF_DATA, LAST_UPDATED_FREQUENCY_MS, ROOM_ID } from "./config.js";
import { getData, getMostRecentTimestamp } from "./fetchData.js";
import { dewPointToColorBuckets, dewPointToEmojisBuckets, getBucket, getNextClosestBucket, getNextClosestThreshold, tempToColorBuckets, tempToEmojisBuckets } from "./buckets.js";
import { getCurrentColorBucket, getCurrentEmojiBucket, getCurrentStat, getCurrentStatFormatted, getCurrentStatLabel } from "./utilities.js";
import { renderChart } from "./renderChart.js";
import { DataLoader } from "./dataLoader.js";

function datetimeToDisplay(unix) {
    const datetime = new Date(unix);
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

        labels.push(datetimeToDisplay(row.bucket_start_unix));
        dataOut.push(getMetricFromRow(row));

        if (diffInMins <= BUCKET_SIZE_MINS) continue;

        let curUnix = row.bucket_start_unix;

        while (diffInMins > BUCKET_SIZE_MINS) {
            diffInMins -= BUCKET_SIZE_MINS;
            curUnix += (BUCKET_SIZE_MINS * 1000 * 60);
            labels.push(datetimeToDisplay(curUnix));
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
    if (minutes <= 120) return "2 hours ago";
    return `${Math.floor(minutes / 60)} hours ago`;
}

function updateStyle() {
    const stat = getCurrentStat(data);
    const color = getBucket(stat, getCurrentColorBucket());
    const emoji = getBucket(stat, getCurrentEmojiBucket());
    const label = getCurrentStatLabel();

    document.body.style.backgroundColor = color;
    document.getElementById('chart').style.backgroundColor = color;
    document.getElementById('statLabel').innerText = label;
    document.getElementById('statEmoji').innerHTML = emoji;
    document.getElementById('headerLink').href = `data:image/svg+xml,<svg xmlns='http://www.w2.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${statEmoji}</text></svg>`;
}

function renderStatBoxes() {
    const stat = getCurrentStatFormatted(data);
    document.getElementById('statVal').innerText = stat;
}

function renderFetchedData() {
    updatedLastUpdated();

    const all = imputeDataMakeLabels(data.getSeries());
    const room = imputeDataMakeLabels(data.getSeries(ROOM_ID));
    const cube = imputeDataMakeLabels(data.getSeries(CUBE_ID));

    renderChart(all, room, cube);

    updateStyle();
    renderStatBoxes();
}

function renderErrorState() {
    const body = document.getElementById('body');
    body.innerHTML = `
        <div id="headerBox">
            <div>
                <h2>Urban AI</h2>
                <h4>Thermal KPIs</h4>
            </div>
            <div id="emojiBox">
            </div>
        </div>
        <div id="errorMessage">
            <h1>Something went wrong and there's nothing we can do about it. 🙈</h1>
            <p>
                It's possible that the internet is down, or there was a meteor strike, or really any number of things could have happened.
            </p>
        </div>
    `;
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function loadData() {
    const secondsOfData = HOURS_OF_DATA * (60 * 60);
    const startUnix = Math.round((Date.now() / 1000) - secondsOfData);
    const endUnix = Math.round(Date.now() / 1000);

    const mostRecentTimestampPromise = getMostRecentTimestamp();
    const uncleanData = await getData(startUnix, endUnix, BUCKET_SIZE_MINS);
    if (!uncleanData || uncleanData.length === 0) {
        return false;
    }
    
    setLastPullTimestamp(Date.now());

    data = new DataLoader(uncleanData);
    setDataState(data);

    const mostRecentTimestamp = (await mostRecentTimestampPromise).pop().max_timestamp;
    setLastDataUpdateTimestamp(mostRecentTimestamp * 1000);

    return true;
}

async function getUpdatedDataLoop() {
    while (true) {
        // Pull new data on a set interval.
        await sleep(DATA_PULL_FREQUENCY_MS);
        const success = await loadData();
        if (!success) {
            renderErrorState();
            throw new Error('Loading data failed!');
        }
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
    const success = await loadData();
    if (!success) {
        renderErrorState();
        throw new Error('Loading data failed!');
    }

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

export function getDataState() {
    return data;
}

function setDataState(dataLoader) {
    data = dataLoader;
}

export function getMetricOptionState() {
    return structuredClone(metricOptionState);
}

function setMetricOptionState(choice) {
    const VALID = ['dewPoint', 'humidity', 'tempF'];
    if (!VALID.includes(choice)) {
        throw new Error('Invalid metric option.');
    }
    metricOptionState = structuredClone(choice);
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
let data = null;
let lastDataUpdateTimestamp = null;
let lastPullTimestamp = null;

main();