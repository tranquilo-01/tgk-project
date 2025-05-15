import * as utils from '../utils/utils';
// https://support.garmin.com/en-US/?faq=e5LwusViLZ95VTDwn2Alt7


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

	updateWindData(TWS: number, GWD: number) {
		this.windData = { TWS, GWD };
	}

	applyFrictionForces() {
		const hullDragForce = this.getFrictionResistance();
		const waveDragForce = this.getApproximatedWaveResistance();
		const totalDragForce = hullDragForce + waveDragForce;
		const dragAngle = Math.atan2(this.body.velocity.y, this.body.velocity.x);
		const dragVector: MatterJS.Vector = { x: -totalDragForce * Math.cos(dragAngle), y: -totalDragForce * Math.sin(dragAngle) }
		this.applyForce(dragVector);

		const getAntiDriftForce = this.getAntiDriftForce();
		this.applyForce(getAntiDriftForce);
		this.applyAntiRotationTorque();
	}

	takeSail() {
		if (this.trimmedSailAngle > this.lowerSailTrimLimit) {
			this.trimmedSailAngle -= 0.5;
		}
	}

	giveSail() {
		if (this.trimmedSailAngle < this.upperSailTrimLimit) {
			this.trimmedSailAngle += 0.5;
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

	getDisplacement(): number {
		return this.wettedArea * this.length; // example
	}

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

	getLiftUnitVector(): MatterJS.Vector {
		const heading = this.getHeading();
		let liftDirection = 0
		if (this.getTack() === "starboard") {
			liftDirection = (heading - 90 + this.trimmedSailAngle) % 360;
		} else {
			liftDirection = (heading + 90 - this.trimmedSailAngle) % 360;
		}
		const liftRadians = utils.degreesToRadians(liftDirection - 90);
		const liftX = Math.cos(liftRadians);
		const liftY = Math.sin(liftRadians);
		return { x: liftX, y: liftY };
	}

	applyTestSailForce() {
		const liftUnitVector = this.getLiftUnitVector();
		const liftForceMagnitude = 3;

		const liftForceX = liftUnitVector.x * liftForceMagnitude;
		const liftForceY = liftUnitVector.y * liftForceMagnitude;
		const liftForce: MatterJS.Vector = { x: liftForceX, y: liftForceY };
		this.applyForce(liftForce);
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


	getAWS(): number {
		const windRadians = ((this.windData.GWD - 180) * Math.PI) / 180;
		const windVector: MatterJS.Vector = { x: Math.sin(windRadians) * this.windData.TWS, y: Math.cos(windRadians) * this.windData.TWS }
		const apparentWindVector: MatterJS.Vector = { x: - this.body.velocity.x + windVector.x, y: - this.body.velocity.y + windVector.y }
		return parseFloat(Math.sqrt(apparentWindVector.x ** 2 + apparentWindVector.y ** 2).toFixed(1))
	}

	getAWA = () => {
		const windRadians = ((this.windData.GWD - 180) * Math.PI) / 180;
		const windVector: MatterJS.Vector = { x: Math.sin(windRadians) * this.windData.TWS, y: Math.cos(windRadians) * this.windData.TWS }
		const apparentWindVector: MatterJS.Vector = { x: - this.body.velocity.x + windVector.x, y: - this.body.velocity.y + windVector.y }
		return (540 + utils.vectorHeading(apparentWindVector) - this.getHeading()) % 360 // where wind comes from not where it goes
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
}

