import { ROOM_ID, CUBE_ID } from "./config.js";
import { cToF, dewPoint } from "./utilities.js";

export class DataLoader {

    constructor(data) {
        this.data = data;   
    }

    getSeries(seriesID) {
        const series = this.__filterSeries(seriesID);
        const bucketed = new Map();
        for (const row of series) {
            const bucketStart = Number(new Date(row.bucket_start));
            const hourStartUnix = Math.trunc(bucketStart / 3600000) * 3600000;
            if (bucketed.has(hourStartUnix)) {
                bucketed.get(hourStartUnix).push(row);
            } else {
                bucketed.set(hourStartUnix, [row]);
            }
        }

        const out = [];
        for (const key of bucketed.keys()) {
            const rows = bucketed.get(key);
            const sum_temp = rows.map((r) => r.sum_temperature).reduce((a, b) => a + b);
            const temp_obs = rows.map((r) => r.temperature_obs).reduce((a, b) => a + b);
            const sum_humidity = rows.map((r) => r.sum_humidity).reduce((a, b) => a + b);
            const humidity_obs = rows.map((r) => r.humidity_obs).reduce((a, b) => a + b);
            const outRow = {
                avg_temp: cToF(sum_temp / temp_obs),
                avg_humidity: sum_humidity / humidity_obs,
                avg_dew_point: cToF(dewPoint(
                    sum_temp / temp_obs,
                    sum_humidity / humidity_obs
                )),
                bucket_start_unix: key
            }
            out.push(outRow);
        }

        return out.sort((a, b) => a.bucket_start_unix - b.bucket_start_unix);
    }

    getCurrentTemp() {
        const currentCubeRow = this.getSeries(CUBE_ID).pop();
        const currentRoomRow = this.getSeries(ROOM_ID).pop();
        return (currentCubeRow.avg_temp + currentRoomRow.avg_temp) / 2;
    }

    getCurrentDewPoint() {
        const currentCubeRow = this.getSeries(CUBE_ID).pop();
        const currentRoomRow = this.getSeries(ROOM_ID).pop();
        return (currentCubeRow.avg_dew_point + currentRoomRow.avg_dew_point) / 2;
    }

    getCurrentHumidity() {
        const currentCubeRow = this.getSeries(CUBE_ID).pop();
        const currentRoomRow = this.getSeries(ROOM_ID).pop();
        return (currentCubeRow.avg_humidity + currentRoomRow.avg_humidity) / 2;
    }

    __filterSeries(seriesID) {
        let series = [...this.data];
        if (seriesID) {
            series = series.filter((row) => row.monitor_id === seriesID);
        }
        return series;
    }

}