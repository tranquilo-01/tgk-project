import * as utils from '../utils/utils';
// https://support.garmin.com/en-US/?faq=e5LwusViLZ95VTDwn2Alt7
//https://en.wikipedia.org/wiki/Forces_on_sails


export class Boat {
	body: MatterJS.BodyType;
	wettedArea: number;
	length: number;
	sailArea: number;
	trimmedSailAngle: number;
	lowerSailTrimLimit: number;
	upperSailTrimLimit: number;
	hullSpeed: number;
	windData: { TWS: number, GWD: number };

	constructor(body: MatterJS.BodyType, wettedArea: number, length: number, mass: number, hullSpeed: number) {
		this.body = body;
		this.wettedArea = wettedArea;
		this.length = length;
		this.body.frictionAir = 0;
		this.body.mass = mass;
		this.body.restitution = 0;
		this.trimmedSailAngle = 45;
		this.lowerSailTrimLimit = 15;
		this.upperSailTrimLimit = 90;
		this.hullSpeed = hullSpeed;
	}

	// --------------------environment data-----------------
	updateWindData(TWS: number, GWD: number) {
		this.windData = { TWS, GWD };
	}

	// ----------------------apply forces-----------------
	applyFrictionForces() {
		const dragVector = this.getWaterDragVector();
		this.applyForce(dragVector);

		const getAntiDriftForce = this.getAntiDriftForce();
		this.applyForce(getAntiDriftForce);
		this.applyAntiRotationTorque();
	}

	getWaterDragVector(): MatterJS.Vector {
		const hullDragForce = this.getFrictionResistance();
		const waveDragForce = this.getApproximatedWaveResistance();
		const totalDragForce = hullDragForce + waveDragForce;
		const dragAngle = Math.atan2(this.body.velocity.y, this.body.velocity.x);
		return { x: -totalDragForce * Math.cos(dragAngle), y: -totalDragForce * Math.sin(dragAngle) }
	}

	applyForce(force: MatterJS.Vector) {
		this.body.force.x += force.x;
		this.body.force.y += force.y;
	}

	applyTorque(torque: number) {
		this.body.torque += torque;
	}

	applyAntiRotationTorque() {
		const sign = - Math.sign(this.body.angularVelocity);
		this.body.torque += sign * 0.0002;
	}

	applyTestSailForce() {
		const liftUnitVector = this.getLiftUnitVector();
		const liftForceMagnitude = 3;

		const liftForceX = liftUnitVector.x * liftForceMagnitude;
		const liftForceY = liftUnitVector.y * liftForceMagnitude;
		const liftForce: MatterJS.Vector = { x: liftForceX, y: liftForceY };
		this.applyForce(liftForce);
	}

	applySailForces() {
		const liftForce = this.getLiftForce();
		this.applyForce(liftForce);
		const dragForce = this.getDragForce();
		this.applyForce(dragForce);
	}

	// --------------------forces---------------------
	getAntiDriftForce(): MatterJS.Vector {
		const driftVector = this.getDriftVector();
		const driftSpeed = Math.sqrt(driftVector.x ** 2 + driftVector.y ** 2);

		if (driftSpeed === 0) {
			return { x: 0, y: 0 }; // No drift, no force needed
		}

		const dragCoefficient = 0.01;
		const area = 20; // Wetted area in m^2
		const roCoefficient = 52; // From Marchaj, page 52

		const dragForceMagnitude = 0.5 * dragCoefficient * area * roCoefficient * driftSpeed ** 2 + 0.3 * Math.pow(driftSpeed, 0.5);

		const unitDriftX = driftVector.x / driftSpeed;
		const unitDriftY = driftVector.y / driftSpeed;

		const forceX = -unitDriftX * dragForceMagnitude;
		const forceY = -unitDriftY * dragForceMagnitude;

		return { x: forceX, y: forceY };
	}

	getFrictionResistance = () => {
		const speed = Math.sqrt(this.body.velocity.x ** 2 + this.body.velocity.y ** 2);
		const dragCoefficient = 0.0001;
		const area = 20; // wetted area in m^2
		const roCoefficent = 52; // marchaj page 52
		const dragForce = 0.5 * dragCoefficient * area * roCoefficent * speed ** 2 + 0.3 * Math.pow(speed, 0.5);
		return dragForce;
	}

	getApproximatedFrictionResistance = () => {
		const coef = 0.2
		const speed = Math.sqrt(this.body.velocity.x ** 2 + this.body.velocity.y ** 2);
		return 0.5 * speed ** 2 * coef
	}

	getApproximatedWaveResistance = () => {

		const speed = Math.sqrt(this.body.velocity.x ** 2 + this.body.velocity.y ** 2);

		const force = (speed ** 5 / this.hullSpeed ** 5 + Math.pow(3, speed - this.hullSpeed))
		return force
	}

	// --------------------sails---------------------
	takeSail(angle: number) {
		if (this.trimmedSailAngle > this.lowerSailTrimLimit) {
			this.trimmedSailAngle -= angle;
		}
	}

	giveSail(angle: number) {
		if (this.trimmedSailAngle < this.upperSailTrimLimit) {
			this.trimmedSailAngle += angle;
		}
	}

	getSailAngle(awa: number): number {
		if (awa < 180) {
			return this.trimmedSailAngle;
		} else {
			return - this.trimmedSailAngle;
		}
	}


	getTack(): string {
		const awa = this.getAWA();
		if (awa < 180) {
			return "starboard";
		} else {
			return "port";
		}
	}

	getAngleOfAttack(): number {
		const awa = this.getAWA(); // 0-360 relative to bow
		// sailAngle is angle of sail relative to boat centerline (+ starboard, - port)
		const sailAngleSigned = this.getSailAngle(awa);

		// Convert AWA to +/- 180 range (e.g. 315 AWA -> -45 deg)
		let awaSymmetric = awa > 180 ? awa - 360 : awa;

		// AoA is the absolute difference
		const angleOfAttack = Math.abs(awaSymmetric - sailAngleSigned);
		return angleOfAttack;
	}

	getLiftUnitVector(): MatterJS.Vector {
		const apparentWindVec = this.getApparentWindGlobalVector();
		const aws = Math.sqrt(apparentWindVec.x ** 2 + apparentWindVec.y ** 2);

		if (aws < 0.001) {
			return { x: 0, y: 0 };
		}
		const unitAwX = apparentWindVec.x / aws;
		const unitAwY = apparentWindVec.y / aws;

		// getTack() determines if wind is from starboard (>0 to 179 AWA) or port side.
		// AWA calculation uses global AW vector and global boat heading, so it's correct.
		if (this.getTack() === "starboard") {
			// Lift is 90 degrees CCW (left) from the global Apparent Wind vector
			return { x: -unitAwY, y: unitAwX };
		} else { // Port tack
			// Lift is 90 degrees CW (right) from the global Apparent Wind vector
			return { x: unitAwY, y: -unitAwX };
		}
	}

	liftCoefficient(): number {
		const angleOfAttack = this.getAngleOfAttack();
		if (angleOfAttack > 11 && angleOfAttack <= 32) {
			return -(1 / 300) * (angleOfAttack - 32) ** 2 + 1.5
		} else if (angleOfAttack > 32 && angleOfAttack <= 90) {
			return -(1.3 / 3364) * (angleOfAttack - 32) ** 2 + 1.5
		} else {
			return 0
		}
	}

	getLiftForce(): MatterJS.Vector {
		const coeff = 0.01;
		const magnitude = coeff * (this.getAWS()) ** 2 * this.liftCoefficient();
		const liftUnitVector = this.getLiftUnitVector();

		const liftForceX = liftUnitVector.x * magnitude;
		const liftForceY = liftUnitVector.y * magnitude;
		const liftForce: MatterJS.Vector = { x: liftForceX, y: liftForceY };
		return liftForce;
	}

	dragCoefficient(): number {
		const angleOfAttack = this.getAngleOfAttack();
		if (angleOfAttack > 0 && angleOfAttack <= 11) {
			return 0.11
		} else if (angleOfAttack > 11 && angleOfAttack <= 90) {
			return -(1.35 / 6400) * (angleOfAttack - 10) ** 2 + 0.15
		} else if (angleOfAttack > 90 && angleOfAttack <= 170) {
			return -(1.35 / 6400) * (angleOfAttack - 170) ** 2 + 1.5
		} else {
			return 0
		}
	}

	dragUnitVector(): MatterJS.Vector {
		const apparentWindVec = this.getApparentWindGlobalVector();
		const aws = Math.sqrt(apparentWindVec.x ** 2 + apparentWindVec.y ** 2);

		if (aws < 0.001) { // Avoid division by zero for very low speeds
			return { x: 0, y: 0 };
		}
		// Drag force is in the direction of the global apparent wind
		return { x: apparentWindVec.x / aws, y: apparentWindVec.y / aws };
	}

	getDragForce(): MatterJS.Vector {
		const coeff = 0.01;
		const magnitude = coeff * (this.getAWS()) ** 2 * this.dragCoefficient();
		const dragUnitVector = this.dragUnitVector();

		const dragForceX = dragUnitVector.x * magnitude;
		const dragForceY = dragUnitVector.y * magnitude;
		const dragForce: MatterJS.Vector = { x: dragForceX, y: dragForceY };
		return dragForce;
	}

	// --------------------plotter data--------------------
	getHeading(): number {
		if (utils.radiansToDegrees(this.body.angle) < 0) {
			return Math.floor(360 + (utils.radiansToDegrees(this.body.angle) % 360))
		}
		return Math.floor((utils.radiansToDegrees(this.body.angle)) % 360)
	}

	getCOG(): number {
		if (this.isStationary()) {
			return this.getHeading()
		}
		return utils.vectorHeading(this.body.velocity)
	}

	isStationary(): boolean {
		return this.getSOG() < 0.1;
	}

	getSOG(): number {
		return parseFloat(Math.sqrt(this.body.velocity.x ** 2 + this.body.velocity.y ** 2).toFixed(1));
	}

	getPosition(): MatterJS.Vector {
		return this.body.position;
	}

	getDriftVector(): MatterJS.Vector {
		const velocityX = this.body.velocity.x;
		const velocityY = this.body.velocity.y;

		const headingAngle = this.body.angle - Math.PI / 2;

		const headingX = Math.cos(headingAngle);
		const headingY = Math.sin(headingAngle);

		const dot = velocityX * headingX + velocityY * headingY;

		const vParallelX = dot * headingX;
		const vParallelY = dot * headingY;

		const driftX = velocityX - vParallelX;
		const driftY = velocityY - vParallelY;

		return { x: driftX, y: driftY };
	}

	getDriftSpeed(): number {
		const driftVector = this.getDriftVector();
		return Math.sqrt(driftVector.x ** 2 + driftVector.y ** 2);
	}


	getAWS(): number {
		const windRadians = ((this.windData.GWD - 180) * Math.PI) / 180;
		const windVector: MatterJS.Vector = { x: Math.sin(windRadians) * this.windData.TWS, y: Math.cos(windRadians) * this.windData.TWS }
		const apparentWindVector: MatterJS.Vector = { x: - this.body.velocity.x + windVector.x, y: - this.body.velocity.y + windVector.y }
		return parseFloat(Math.sqrt(apparentWindVector.x ** 2 + apparentWindVector.y ** 2).toFixed(1))
	}

	private getApparentWindGlobalVector(): MatterJS.Vector {
		const trueWind_TWS = this.windData.TWS;
		const trueWind_GWD = this.windData.GWD; // Your TWD input

		// This is your existing calculation, confirmed to be correct for your setup
		const windRad = ((trueWind_GWD - 180) * Math.PI) / 180;
		const trueWindGlobalVector = {
			x: Math.sin(windRad) * trueWind_TWS,
			y: Math.cos(windRad) * trueWind_TWS
		};

		// Apparent Wind = True Wind (global) - Boat Velocity (global)
		// this.body.velocity is already in global Matter.js coordinates.
		return {
			x: trueWindGlobalVector.x - this.body.velocity.x,
			y: trueWindGlobalVector.y - this.body.velocity.y
		};
	}

	getAWA = () => {
		const windRadians = ((this.windData.GWD - 180) * Math.PI) / 180;
		const windVector: MatterJS.Vector = { x: Math.sin(windRadians) * this.windData.TWS, y: Math.cos(windRadians) * this.windData.TWS }
		const apparentWindVector: MatterJS.Vector = { x: - this.body.velocity.x + windVector.x, y: - this.body.velocity.y + windVector.y }
		return (540 + utils.vectorHeading(apparentWindVector) - this.getHeading()) % 360 // where wind comes from not where it goes
	}

	private getGlobalTrueWindVector(): MatterJS.Vector {
		if (!this.windData) return { x: 0, y: 0 };
		// Convert GWD (0=N, 90=E, meteorological) to math angle (0=E, 90=N, vector direction)
		// Math angle = (450 - GWD) % 360 or ( (90 - GWD) + 360 ) % 360
		const mathAngleDeg = (450 - this.windData.GWD) % 360;
		const windRadians = utils.degreesToRadians(mathAngleDeg);

		const windX = Math.cos(windRadians) * this.windData.TWS;
		const windY = Math.sin(windRadians) * this.windData.TWS;
		return { x: windX, y: windY };
	}


	// ---------------------boat data--------------------
	getDisplacement(): number {
		return this.wettedArea * this.length; // example
	}

}

