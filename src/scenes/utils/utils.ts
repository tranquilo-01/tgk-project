export const radiansToDegrees = (radians: number) => {
    return (radians * 180) / Math.PI
}

export const degreesToRadians = (degrees: number) => {
    return (degrees * Math.PI) / 180
}

export const vectorGeographicAngle = (vector: MatterJS.Vector) => {
    const radians = Math.atan2(vector.x, -vector.y);
    let degrees = radians * (180 / Math.PI);
    const normalizedDegrees = degrees < 0 ? 360 + degrees : degrees;
    return Math.floor(normalizedDegrees);
}

export const vectorLength = (vector: MatterJS.Vector) => {
    return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
}
