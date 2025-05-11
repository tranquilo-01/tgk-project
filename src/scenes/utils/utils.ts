export const radiansToDegrees = (radians: number) => {
    return (radians * 180) / Math.PI
}

export const vectorHeading = (vector: MatterJS.Vector) => {
    const radians = Math.atan2(vector.x, -vector.y);
    let degrees = radians * (180 / Math.PI);
    const normalizedDegrees = degrees < 0 ? 360 + degrees : degrees;
    return Math.floor(normalizedDegrees);
}
