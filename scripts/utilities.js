import { dewPointToColorBuckets, dewPointToEmojisBuckets, humidityToColorBuckets, humidityToEmojiBuckets, tempToColorBuckets, tempToEmojisBuckets } from "./buckets.js";
import { getMetricOptionState } from "./main.js";

export function cToF(c) {
    return (c * (9 / 5)) + 32;
}

export function dewPoint(tempC, humidity) {
    const rh = humidity / 100;

    const A = 17.27;
    const H = 237.7;

    const gamma = (A * tempC) / (H + tempC) + Math.log(rh);
    const dewPointC = (H * gamma) / (A - gamma);

    return dewPointC;
}

export function getCurrentStat(dataLoader) {
    const choice = getMetricOptionState();
    if (choice === 'tempF') {
        return dataLoader.getCurrentTemp();
    } else if (choice === 'dewPoint') {
        return dataLoader.getCurrentDewPoint();
    } else {
        return dataLoader.getCurrentHumidity();
    }
}

export function getCurrentStatFormatted(dataLoader) {
    const choice = getMetricOptionState();
    if (choice === 'tempF') {
        const temp = dataLoader.getCurrentTemp();
        const tempRounded = Math.round(temp);
        return `${tempRounded}°`;
    } else if (choice === 'dewPoint') {
        const dew = dataLoader.getCurrentDewPoint();
        const dewRounded = Math.round(dew);
        return `${dewRounded}%`;
    } else {
        const humidity = dataLoader.getCurrentHumidity();
        const humidityRounded = Math.round(humidity);
        return `${humidityRounded}%`;
    }
}

export function getCurrentEmojiBucket() {
    const choice = getMetricOptionState();
    if (choice === 'tempF') {
        return tempToEmojisBuckets;
    } else if (choice === 'dewPoint') {
        return dewPointToEmojisBuckets;
    } else {
        return humidityToEmojiBuckets;
    }
}

export function getCurrentColorBucket() {
    const choice = getMetricOptionState();
    if (choice === 'tempF') {
        return tempToColorBuckets;
    } else if (choice === 'dewPoint') {
        return dewPointToColorBuckets;
    } else {
        return humidityToColorBuckets;
    }
}

export function getCurrentStatLabel() {
    const choice = getMetricOptionState();
    if (choice === 'tempF') {
        return 'Temperature';
    } else if (choice === 'dewPoint') {
        return 'Dew Point';
    } else {
        return 'Humidity';
    }
}