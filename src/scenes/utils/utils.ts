export const calculateHdg = (boat: MatterJS.BodyType) => {
    if (radiansToDegrees(boat.angle) < 0) {
        return Math.floor(360 + (radiansToDegrees(boat.angle) % 360))
    }
    return Math.floor((radiansToDegrees(boat.angle)) % 360)
}

export const calculateCOG = (boat: MatterJS.BodyType) => {
    if(boat.velocity.x === 0 && boat.velocity.y === 0) {
        return calculateHdg(boat)
    }
    return vectorHeading(boat.velocity)
}

export const calculateSOG = (boat: MatterJS.BodyType) => {
    return Math.sqrt(boat.velocity.x ** 2 + boat.velocity.y ** 2).toFixed(1)
}


export const calculatePosition = (boat: MatterJS.BodyType) => {
    return boat.position
}

export const calculateAWS = (boat: MatterJS.BodyType, GWD: number, TWS: number) => {
    const angleBetweenBoatAndWind = Math.abs(GWD - calculateCOG(boat))
    return Math.floor(Math.sqrt(boat.velocity.x ** 2 + boat.velocity.y ** 2) * Math.cos(angleBetweenBoatAndWind) + TWS)
}

export const calculateAWA = (boat: MatterJS.BodyType, GWD: number, TWS: number) => {
    // FIXME: this is not correct
    const windVector : MatterJS.Vector = { x: Math.cos(GWD) * TWS, y: Math.sin(GWD) * TWS }
    const apparentWindVector : MatterJS.Vector = { x: boat.velocity.x + windVector.x, y: boat.velocity.y + windVector.y }
    return vectorHeading(apparentWindVector)
}

const radiansToDegrees = (radians: number) => {
    return (radians * 180) / Math.PI
}

const vectorHeading = (vector: MatterJS.Vector) => {
        // Use Math.atan2 to calculate the angle
    // Note the reversed y argument to match Phaser's coordinate system
    const radians = Math.atan2(vector.x, -vector.y);
    
    // Convert radians to degrees
    let degrees = radians * (180 / Math.PI);
    
    // Normalize to 0-360 range, with 0 at up (north)
    // Math.atan2 returns -180 to 180, so we need to adjust
    const normalizedDegrees = degrees < 0 ? 360 + degrees : degrees;
    
    return Math.floor(normalizedDegrees);
}

const vectorLength = (vector: MatterJS.Vector) => {
    return Math.sqrt(vector.x ** 2 + vector.y ** 2)
}
