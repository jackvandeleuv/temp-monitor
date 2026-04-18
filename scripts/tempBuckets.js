export const SKULL_EMOJI = '💀';

// Upper boundaries.
export const tempToEmojisMap = new Map([
    [64, '🧊'],
    [67, '❄️'],
    [69, '🐧'],
    [75, '🙆'],
    [78, '🙎'],
    [81, '🕯️'],
    [84, '🔥'],
    [88, '💀'],
]);

// Upper boundaries.
const minTempColor = 'oklch(88.2% 0.059 254.128)';
const tempColorMap = new Map([
    [64, 'oklch(88.2% 0.059 254.128)'],
    [67, 'oklch(88.2% 0.059 254.128)'],
    [69, 'oklch(93.2% 0.032 255.585)'],
    [75, 'oklch(97% 0 0)'],
    [78, 'oklch(97% 0 0)'],
    [81, 'oklch(88.5% 0.062 18.334)'],
    [84, 'oklch(80.8% 0.114 19.571)']
]);

export function tempToBucketed(temp) {
    const thresholds = [...tempToEmojisMap.keys()].sort();
    const diffs = [];
    for (let i = 0; i < thresholds.length; i++) {
        diffs.push([thresholds[i], Math.abs(thresholds[i] - temp)]);
    }
    diffs.sort((a, b) => b[1] - a[1]);
    
    return diffs.pop()[0];
}

export function tempToEmojis(temp) {
    const rounded = Math.round(temp);
    if (rounded < 64) return SKULL_EMOJI;
    
    for (let i = rounded; i <= 88; i++) {
        if (tempToEmojisMap.has(i)) {
            return tempToEmojisMap.get(i);
        }
    }

    return SKULL_EMOJI;
}

export function tempToColor(temp) {
    const rounded = Math.round(temp);
    if (rounded < 64) return minTempColor;
    
    for (let i = rounded; i <= 84; i++) {
        if (tempToEmojisMap.has(i)) {
            return tempToEmojisMap.get(i);
        }
    }

    return 'oklch(80.8% 0.114 19.571)';
}

export function dewPointToEmojis(dewPoint) {
    if (dewPoint < 30) {        // below 30: extremely dry
        return "💀"
    } else if (dewPoint < 40) { // 30 - 39: dry
        return "🌵"
    } else if (dewPoint < 45) { // 40 - 44: slightly dry
        return "🐪"
    } else if (dewPoint < 55) { // 45 - 54: ideal / very comfortable
        return "😻"
    } else if (dewPoint < 58) { // 55 - 57: still comfortable
        return "🙂"
    } else if (dewPoint < 63) { // 58 - 62: humid indoors
        return "😓"
    } else if (dewPoint < 68) { // 63 - 67: muggy
        return "🥵"
    } else {                    // 68 and above: oppressive
        return "💀"
    }
}
