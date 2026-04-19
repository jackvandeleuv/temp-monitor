import { dewPointToColorBuckets, dewPointToEmojisBuckets, getBucket, getNextClosestBucket, getNextClosestThreshold, tempToColorBuckets, tempToEmojisBuckets } from "./buckets.js";
import { MIN_THRESHOLD_DISTANCE } from "./config.js";
import { getAvgCurrentDewPoint, getAvgCurrentHumidity, getAvgCurrentTemp, getMetricOptionState } from "./main.js";

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
    const choice = getMetricOptionState();
    if (choice === 'tempF') {
        return getAvgCurrentTemp();;
    } else if (choice === 'dewPoint') {
        return getAvgCurrentDewPoint();;
    } else {
        return getAvgCurrentHumidity();
    }
}

function makeTempLineSpec() {
    const avgTemp = getAvgCurrentTemp();
    const nearestBucketThreshold = getNextClosestThreshold(avgTemp, tempToEmojisBuckets);

    if (Math.abs(avgTemp - nearestBucketThreshold) > MIN_THRESHOLD_DISTANCE) {
        return makeEmptyLineSpec();
    }

    const nearestBucketEmoji = getNextClosestBucket(avgTemp, tempToEmojisBuckets);
    const nearestColor = getNextClosestBucket(avgTemp, tempToColorBuckets);

    const yAdjust = avgTemp < nearestBucketThreshold ? 23 : -23;

    return {
        type: 'line',
        borderWidth: 1,
        borderColor: 'black',
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
    const avgDewPoint = getAvgCurrentDewPoint();
    const nearestBucketThreshold = getNextClosestThreshold(avgDewPoint, dewPointToEmojisBuckets);

    if (Math.abs(avgDewPoint - nearestBucketThreshold) > MIN_THRESHOLD_DISTANCE) {
        return makeEmptyLineSpec();
    }

    const nearestBucketEmoji = getNextClosestBucket(avgDewPoint, dewPointToEmojisBuckets);
    const nearestColor = getNextClosestBucket(avgDewPoint, dewPointToColorBuckets);
    const yAdjust = avgDewPoint < nearestBucketThreshold ? 23 : -23;

    return {
        type: 'line',
        borderWidth: 1,
        borderColor: 'black',
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

export function renderChart(room, cube) {
    const lineSpec = makeLineSpec();
    const avgMetric = getCurrentAvgMetric();

    // Set default min/max.
    const numericData = [...room.data, ...cube.data].map((val) => Number(val));
    let chartMin = Math.round(Math.min(...numericData)) - 1;
    let chartMax = Math.round(Math.max(...numericData)) + 1;

    // If there is a constant line to display.
    if (lineSpec.display !== makeEmptyLineSpec().display) {
        if (lineSpec.yMin > avgMetric) {
            chartMax = Math.round(lineSpec.yMin + 1);
        } else {
            chartMin = Math.round(lineSpec.yMin - 1);
        }
    }

    const datasets = [
        {
            label: 'Cubicle',
            data: cube.data,
            borderWidth: 2,
            borderColor: "black",
            backgroundColor: "black",
        },
        {
            label: 'Conference Room',
            data: room.data,
            borderWidth: 2,
            borderDash: [6, 6],
            borderColor: "black",
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