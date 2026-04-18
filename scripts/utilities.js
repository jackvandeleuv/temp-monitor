
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
