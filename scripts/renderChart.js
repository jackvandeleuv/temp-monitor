import { dewPointToColorBuckets, dewPointToEmojisBuckets, getBucket, getNextClosestBucket, getNextClosestThreshold, tempToColorBuckets, tempToEmojisBuckets } from "./buckets.js";
import { MIN_THRESHOLD_DISTANCE } from "./config.js";
import { getDataState, getMetricOptionState } from "./main.js";

function makeLineSpec() {
    const choice = getMetricOptionState();
    if (choice === 'tempF') {
        return makeTempLineSpec()
    } else if (choice === 'dewPoint') {
        return makeDewPointLineSpec()
    } else {
        return makeEmptyLineSpec();
    }
}

function getCurrentAvgMetric() {
    const dataLoader = getDataState();
    const choice = getMetricOptionState();
    if (choice === 'tempF') {
        return dataLoader.getCurrentTemp();
    } else if (choice === 'dewPoint') {
        return dataLoader.getCurrentDewPoint();
    } else {
        return dataLoader.getCurrentHumidity();
    }
}

function makeTempLineSpec() {
    const avgTemp = getDataState().getCurrentTemp();
    const nearestBucketThreshold = getNextClosestThreshold(avgTemp, tempToEmojisBuckets);

    if (Math.abs(avgTemp - nearestBucketThreshold) > MIN_THRESHOLD_DISTANCE) {
        return makeEmptyLineSpec();
    }

    const nearestBucketEmoji = getNextClosestBucket(avgTemp, tempToEmojisBuckets);
    const nearestColor = getNextClosestBucket(avgTemp, tempToColorBuckets);

    const yAdjust = avgTemp < nearestBucketThreshold ? 23 : -23;

    return {
        type: 'line',
        borderWidth: 2,
        borderColor: 'oklch(70.7% 0.022 261.325)',
        yMin: nearestBucketThreshold,
        yMax: nearestBucketThreshold,
        label: {
            display: true,
            content: nearestBucketEmoji,
            position: 'start',
            font: {
                size: 30,
            },
            backgroundColor: nearestColor,
            padding: 1,
            display: 'flex',
            yAdjust: yAdjust,
        },
    }
}

function makeDewPointLineSpec() {
    const avgDewPoint = getDataState().getCurrentDewPoint();
    const nearestBucketThreshold = getNextClosestThreshold(avgDewPoint, dewPointToEmojisBuckets);

    if (Math.abs(avgDewPoint - nearestBucketThreshold) > MIN_THRESHOLD_DISTANCE) {
        return makeEmptyLineSpec();
    }

    const nearestBucketEmoji = getNextClosestBucket(avgDewPoint, dewPointToEmojisBuckets);
    const nearestColor = getNextClosestBucket(avgDewPoint, dewPointToColorBuckets);
    const yAdjust = avgDewPoint < nearestBucketThreshold ? 23 : -23;

    return {
        type: 'line',
        borderWidth: 2,
        borderColor: 'oklch(70.7% 0.022 261.325)',
        yMin: nearestBucketThreshold,
        yMax: nearestBucketThreshold,
        label: {
            display: true,
            content: nearestBucketEmoji,
            position: 'start',
            font: {
                size: 30,
            },
            backgroundColor: nearestColor,
            padding: 1,
            display: 'flex',
            yAdjust: yAdjust,
        },
    }
}

function makeEmptyLineSpec() {
    return {
        display: false,
    }
}

function ffillVals(vals) {
    const out = [];
    if (vals.length === 0) { 
        return out;
    }

    let prev = vals[0];
    for (const val of vals) {
        if (val === null) {
            out.push(prev);
            continue;
        }
        out.push(val);
        prev = val;
    }

    return out;
}

function getDefaultChartMin(allData, roomData, cubeData) {
    const minVal = Math.min(...allData, ...roomData, ...cubeData);
    const chartMin = Math.round(minVal) - 1;
    return chartMin;
}

function getDefaultChartMax(allData, roomData, cubeData) {
    const maxVal = Math.max(...allData, ...roomData, ...cubeData);
    const chartMax = Math.round(maxVal) + 1;
    return chartMax;
}

export function renderChart(all, room, cube) {
    const lineSpec = makeLineSpec();
    const avgMetric = getCurrentAvgMetric();

    // Set default min/max.
    let chartMin = getDefaultChartMin(all.data, room.data, cube.data);
    let chartMax = getDefaultChartMax(all.data, room.data, cube.data);

    // If there is a constant line to display.
    if (lineSpec.display !== makeEmptyLineSpec().display) {
        if (lineSpec.yMin > avgMetric) {
            chartMax = Math.max(
                Math.round(lineSpec.yMin + 1),
                chartMax
            );
        } else {
            chartMin = Math.min(
                Math.round(lineSpec.yMin - 1),
                chartMin
            );
        }
    }

    const datasets = [
        {
            label: 'Overall',
            data: all.data,
            borderWidth: 3,
            borderColor: "oklch(13% 0.028 261.692)",
            backgroundColor: "black",
        },
        {
            label: 'Cubicle',
            data: cube.data,
            borderWidth: 1,
            borderDash: [6, 6],
            borderColor: "oklch(70.7% 0.022 261.325)",
            backgroundColor: "oklch(70.7% 0.022 261.325)",
            pointStyle: 'rectRot',
        },
        {
            label: 'Conference Room',
            data: room.data,
            borderWidth: 1,
            borderDash: [6, 6],
            borderColor: 'oklch(70.7% 0.022 261.325)', 
            backgroundColor: "oklch(70.7% 0.022 261.325)",
            pointStyle: 'triangle',
        },
    ];

    if (getChartObj()) {
        const chart = getChartObj();
        chart.data.datasets = datasets;
        chart.data.labels = room.labels;
        chart.options.scales.y.title.text = getChoiceDisplayLabel();
        chart.options.scales.y.min = chartMin;
        chart.options.scales.y.max = chartMax;
        chart.options.plugins.annotation.annotations.constLine = lineSpec;
        chart.options.scales.y.autoSkip = false;
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
                        constLine: lineSpec,
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
                        },
                        autoSkip: false,
                        stepSize: 1,
                    },
                    max: chartMax,
                    min: chartMin,
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

function setChartObj(chartObj) {
    chart = chartObj;
}

function getChartObj() {
    return chart;
}

let chart = null;