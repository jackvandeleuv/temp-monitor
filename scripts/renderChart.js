import { dewPointToColorBuckets, dewPointToEmojisBuckets, getBucket, getNextClosestBucket, getNextClosestThreshold, tempToColorBuckets, tempToEmojisBuckets } from "./buckets.js";
// import { TEST_TEMP } from "./config.js";
import { getAvgCurrentDewPoint, getAvgCurrentTemp, getMetricOptionState } from "./main.js";

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

function makeTempLineSpec() {
    const avgTemp = getAvgCurrentTemp();
    const nearestBucketThreshold = getNextClosestThreshold(avgTemp, tempToEmojisBuckets);

    if (Math.abs(avgTemp - nearestBucketThreshold) > 2) {
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

    if (Math.abs(avgDewPoint - nearestBucketThreshold) > 2) {
        return makeEmptyLineSpec();
    }

    const nearestBucketEmoji = getNextClosestBucket(avgDewPoint, dewPointToEmojisBuckets);
    const nearestColor = getNextClosestBucket(avgDewPoint, dewPointToColorBuckets);
    console.log(nearestBucketThreshold)
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
        type: 'line',
        borderWidth: 1,
        borderColor: 'black',
    }
}

export function renderChart(room, cube) {
    const datasets = [
        {
            label: 'Cubicle',
            data: cube.data,
            // data: [
            //     TEST_TEMP + -.4, TEST_TEMP + 1.3, 
            //     TEST_TEMP - 1, TEST_TEMP + 1.2, 
            //     TEST_TEMP - 1.1, TEST_TEMP + 3, 
            //     TEST_TEMP, TEST_TEMP + 4, 
            //     TEST_TEMP - 1.1, TEST_TEMP + 1, 
            //     TEST_TEMP - 1, TEST_TEMP + 1, 
            //     TEST_TEMP - 1, TEST_TEMP + 1, 
            //     TEST_TEMP - 1, TEST_TEMP + 1, 
            //     TEST_TEMP +1, TEST_TEMP + 1, 
            //     TEST_TEMP +1, TEST_TEMP + 4, 
            //     TEST_TEMP - 1, TEST_TEMP + 5, 
            //     TEST_TEMP - 1, TEST_TEMP + 1, 
            //     TEST_TEMP - 1, TEST_TEMP + 1.4, 
            // ],
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
                        },
                    },
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