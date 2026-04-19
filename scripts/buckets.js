export const tempToEmojisBuckets = [
    [-Infinity, 59, '💀'],
    [60, 64, '🧊'],
    [65, 67, '🐧'],
    [68, 77, '💁'],
    [78, 80, '🍵'],
    [81, 82, '🕯️'],
    [83, 85, '🔥'],
    [86, Infinity, '💀'],
];

export const tempToColorBuckets = [
    [-Infinity, 59, 'oklch(88.2% 0.059 254.128)'],
    [60, 64, 'oklch(88.2% 0.059 254.128)'],
    [65, 67, 'oklch(93.2% 0.032 255.585)'],
    [68, 77, 'oklch(97% 0 0)'],
    [78, 80, 'oklch(97% 0 0)'],
    [81, 82, 'oklch(88.5% 0.062 18.334)'],
    [83, 85, 'oklch(80.8% 0.114 19.571)'],
    [86, Infinity, 'oklch(80.8% 0.114 19.571)'],
];

export const dewPointToEmojisBuckets = [
    [-Infinity, 10, '💀'],
    [11, 20, '🌵'],
    [21, 39, '🐪'],
    [40, 57, '😻'],
    [58, 62, '😓'],
    [63, 67, '🥵'],
    [68, Infinity, '💀'],
];

export const dewPointToColorBuckets = [
    [-Infinity, 10, 'oklch(88.2% 0.059 254.128)'],
    [11, 20, 'oklch(88.2% 0.059 254.128)'],
    [21, 39, 'oklch(93.2% 0.032 255.585)'],
    [40, 57, 'oklch(97% 0 0)'],
    [58, 62, 'oklch(88.5% 0.062 18.334)'],
    [63, 67, 'oklch(80.8% 0.114 19.571)'],
    [68, Infinity, 'oklch(80.8% 0.114 19.571)'],
];

export function getBucket(value, buckets) {
    const rounded = Math.round(value);
    for (let i = 0; i < buckets.length; i++) {
        const bucket = buckets[i];
        const bucketMin = bucket[0];
        const bucketMax = bucket[1];
        const bucketValue = bucket[2];
        if (rounded >= bucketMin && rounded <= bucketMax) {
            return bucketValue;
        }
    }
}

export function getNextClosestBucket(value, buckets) {
    `
        Get the next closest bucket (exclude the very closest).
    `
    const rounded = Math.round(value);

    let out = null;
    let smallestDiff = Infinity;
    for (let i = 0; i < buckets.length; i++) {
        const bucket = buckets[i];
        const bucketMin = bucket[0];
        const bucketMax = bucket[1];
        const bucketValue = bucket[2];
        if (rounded >= bucketMin && rounded <= bucketMax) {
            continue;
        }
        const diff = Math.min(Math.abs(bucketMin - rounded), Math.abs(bucketMax - rounded));
        if (diff < smallestDiff) {
            smallestDiff = diff;
            out = bucketValue;
        }
    }

    return out;
}

export function getNextClosestThreshold(value, buckets) {
    `
        The threshold the crossing of which will put us into a 
        new bucket.
    `
    const rounded = Math.round(value);

    let out = null;
    let smallestDiff = Infinity;
    for (let i = 0; i < buckets.length; i++) {
        const bucket = buckets[i];
        const bucketMin = bucket[0];
        const bucketMax = bucket[1];
        const bucketValue = bucket[2];
        if (rounded >= bucketMin && rounded <= bucketMax) {
            continue;
        }
        const minDiff = Math.abs(bucketMin - rounded);
        const maxDiff = Math.abs(bucketMax - rounded);
        const diff = Math.min(minDiff, maxDiff);
        if (diff < smallestDiff) {
            smallestDiff = diff;
            if (minDiff < maxDiff) {
                out = bucketMin;
            } else {
                out = bucketMax;
            }
        }
    }

    return out;
}