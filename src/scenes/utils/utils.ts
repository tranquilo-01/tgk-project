// https://support.garmin.com/en-US/?faq=e5LwusViLZ95VTDwn2Alt7

export const calculateHdg = (boat: MatterJS.BodyType) => {
    if (radiansToDegrees(boat.angle) < 0) {
        return Math.floor(360 + (radiansToDegrees(boat.angle) % 360))
    }
    return Math.floor((radiansToDegrees(boat.angle)) % 360)
}

export const calculateCOG = (boat: MatterJS.BodyType) => {
    if (isStationary(boat)) {
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
    return Math.abs(Math.floor(Math.sqrt(boat.velocity.x ** 2 + boat.velocity.y ** 2) * Math.cos(angleBetweenBoatAndWind) + TWS))
}

export const calculateAWA = (boat: MatterJS.BodyType, GWD: number, TWS: number) => {
    const windRadians = ((GWD - 180) * Math.PI) / 180;
    const windVector: MatterJS.Vector = { x: Math.sin(windRadians) * TWS, y: Math.cos(windRadians) * TWS }

    const apparentWindVector: MatterJS.Vector = { x: - boat.velocity.x + windVector.x, y: - boat.velocity.y + windVector.y }

    return (540 + vectorHeading(apparentWindVector) - calculateCOG(boat)) % 360 // where wind comes from not where it goes
}

const radiansToDegrees = (radians: number) => {
    return (radians * 180) / Math.PI
}

const vectorHeading = (vector: MatterJS.Vector) => {
    const radians = Math.atan2(vector.x, -vector.y);
    let degrees = radians * (180 / Math.PI);
    const normalizedDegrees = degrees < 0 ? 360 + degrees : degrees;
    return Math.floor(normalizedDegrees);
}

const isStationary = (boat: MatterJS.BodyType) => {
    return boat.velocity.x < 0.1 && boat.velocity.y < 0.1
}
