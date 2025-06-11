import * as utils from '../utils/utils';
// https://support.garmin.com/en-US/?faq=e5LwusViLZ95VTDwn2Alt7
//https://en.wikipedia.org/wiki/Forces_on_sails


export class Boat {
	sprite: Phaser.Physics.Matter.Sprite;
	body: MatterJS.BodyType;
	wettedArea: number;
	length: number;
	sailArea: number;
	trimmedSailAngle: number;
	lowerSailTrimLimit: number;
	upperSailTrimLimit: number;
	hullSpeed: number;
	windVector: MatterJS.Vector = { x: 0, y: 0 };

	constructor(scene: Phaser.Scene, x: number, y: number, wettedArea: number, length: number, mass: number, hullSpeed: number) {
		this.sprite = scene.matter.add.sprite(x, y, 'boat');
		this.body = this.sprite.body as MatterJS.BodyType;
		this.sprite.setScale(0.15); // Scale 20x smaller
		this.wettedArea = wettedArea;
		this.length = length;
		this.body.frictionAir = 0;
		this.body.mass = mass;
		this.body.inverseMass = 1 / mass;
		this.body.restitution = 0;
		this.trimmedSailAngle = 45;
		this.lowerSailTrimLimit = 15;
		this.upperSailTrimLimit = 90;
		this.hullSpeed = hullSpeed;
	}

	// --------------------environment data-----------------
	updateWindVector(wind: MatterJS.Vector) {
		this.windVector = wind;
	}

	// ----------------------apply forces-----------------
	applyFrictionForces() {
		const dragVector = this.waterDragVector();
		this.applyForce(dragVector);

		const getAntiDriftForce = this.getAntiDriftForce();
		this.applyForce(getAntiDriftForce);
		this.applyAntiRotationTorque();
	}

	waterDragVector(): MatterJS.Vector {
		const hullDragForce = this.waterFrictionResistance();
		const waveDragForce = this.waveResistance();
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
		this.body.torque -= this.body.angularVelocity * 0.4;
	}

	applySailForces() {
		const liftForce = this.liftForce();
		this.applyForce(liftForce);
		const dragForce = this.sailDragForce();
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

	waterFrictionResistance = () => {
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

	waveResistance = () => {
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

	sailAngle(): number {
		const awa = this.getAWA();
		if (awa < 180) {
			// stb tack
			if (awa >= this.trimmedSailAngle) {
				// ok
				return this.trimmedSailAngle;
			}
			// in irons
			else {
				return awa;
			}
			// port tack
		} else {
			// ok
			if (360 - awa >= this.trimmedSailAngle) {
				return - this.trimmedSailAngle;
			}
			// in irons
			else {
				return awa - 360;
			}
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
		const sailAngleSigned = this.sailAngle();

		// Convert AWA to +/- 180 range (e.g. 315 AWA -> -45 deg)
		let awaSymmetric = awa > 180 ? awa - 360 : awa;

		// AoA is the absolute difference
		const angleOfAttack = Math.abs(awaSymmetric - sailAngleSigned);
		return angleOfAttack;
	}

	liftUnitVector(): MatterJS.Vector {
		const apparentWindVec = this.apparentWindVector();
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

	liftForce(): MatterJS.Vector {
		const coeff = 0.01;
		const magnitude = coeff * (this.getAWS()) ** 2 * this.liftCoefficient();
		const liftUnitVector = this.liftUnitVector();

		const liftForceX = liftUnitVector.x * magnitude;
		const liftForceY = liftUnitVector.y * magnitude;
		const liftForce: MatterJS.Vector = { x: liftForceX, y: liftForceY };
		return liftForce;
	}

	sailDragCoefficient(): number {
		const angleOfAttack = this.getAngleOfAttack();
		if (angleOfAttack >= 0 && angleOfAttack <= 11) {
			return 0.11
		} else if (angleOfAttack > 11 && angleOfAttack <= 90) {
			return (1.35 / 6400) * (angleOfAttack - 10) ** 2 + 0.15
		} else if (angleOfAttack > 90 && angleOfAttack <= 170) {
			return (1.35 / 6400) * (angleOfAttack - 170) ** 2 + 0.15
		} else {
			return 0
		}
	}

	dragUnitVector(): MatterJS.Vector {
		const apparentWindVec = this.apparentWindVector();
		const aws = Math.sqrt(apparentWindVec.x ** 2 + apparentWindVec.y ** 2);

		if (aws < 0.01) { // Avoid division by zero for very low speeds
			return { x: 0, y: 0 };
		}
		// Drag force is in the direction of the global apparent wind
		return { x: apparentWindVec.x / aws, y: apparentWindVec.y / aws };
	}

	sailDragForce(): MatterJS.Vector {
		const coeff = 0.01;
		const magnitude = coeff * (this.getAWS()) ** 2 * this.sailDragCoefficient();
		const dragUnitVector = this.dragUnitVector();

		const dragForceX = dragUnitVector.x * magnitude;
		const dragForceY = dragUnitVector.y * magnitude;
		const dragForce: MatterJS.Vector = { x: dragForceX, y: dragForceY };
		return dragForce;
		// return { x: 0, y: 0 };
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
		return utils.vectorGeographicAngle(this.body.velocity)
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
		const apparentWindVector = this.apparentWindVector();
		return parseFloat(Math.sqrt(apparentWindVector.x ** 2 + apparentWindVector.y ** 2).toFixed(1))
	}

	private apparentWindVector(): MatterJS.Vector {
		return {
			x: this.windVector.x - this.body.velocity.x,
			y: this.windVector.y - this.body.velocity.y
		};
	}

	// Calculate apparent wind angle in degrees (0-359)
	// 0 = wind from the bow, 90 = starboard beam, 180 = stern, 270 = port beam
	getAWA = () => {
		const apparentWind = this.apparentWindVector();
		if (Math.abs(apparentWind.x) < 0.01 && Math.abs(apparentWind.y) < 0.01) {
			return 0; // No apparent wind
		}

		// Calculate the apparent wind angle relative to the world coordinates
		let windAngleDegrees = utils.radiansToDegrees(Math.atan2(apparentWind.y, apparentWind.x));

		// Adjust to 0-359 range
		windAngleDegrees = (windAngleDegrees + 360) % 360;

		// Adjust by boat heading to get relative angle
		const heading = this.getHeading();
		let awa = (windAngleDegrees - heading + 270) % 360;

		return Math.round(awa);
	}


	// ---------------------boat data--------------------
	getDisplacement(): number {
		return this.wettedArea * this.length; // example
	}

}

