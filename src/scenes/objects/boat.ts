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

	applyFrictionForces() {
		const hullDragForce = this.getFrictionResistance();
		const waveDragForce = this.getApproximatedWaveResistance();
		// const waveDragForce = 0;
		const totalDragForce = hullDragForce + waveDragForce;
		const dragAngle = Math.atan2(this.body.velocity.y, this.body.velocity.x);
		const dragVector: MatterJS.Vector = { x: -totalDragForce * Math.cos(dragAngle), y: -totalDragForce * Math.sin(dragAngle) }
		this.applyForce(dragVector);
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

	getTack(GWD: number, TWS: number): string {
		const awa = this.getAWA(GWD, TWS);
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

	rotate(angle: number) {
		this.body.angle += angle;
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

	getAWS(GWD: number, TWS: number): number {
		const windRadians = ((GWD - 180) * Math.PI) / 180;
		const windVector: MatterJS.Vector = { x: Math.sin(windRadians) * TWS, y: Math.cos(windRadians) * TWS }
		const apparentWindVector: MatterJS.Vector = { x: - this.body.velocity.x + windVector.x, y: - this.body.velocity.y + windVector.y }
		return parseFloat(Math.sqrt(apparentWindVector.x ** 2 + apparentWindVector.y ** 2).toFixed(1))
	}

	getAWA = (GWD: number, TWS: number) => {
		const windRadians = ((GWD - 180) * Math.PI) / 180;
		const windVector: MatterJS.Vector = { x: Math.sin(windRadians) * TWS, y: Math.cos(windRadians) * TWS }
		const apparentWindVector: MatterJS.Vector = { x: - this.body.velocity.x + windVector.x, y: - this.body.velocity.y + windVector.y }
		return (540 + utils.vectorHeading(apparentWindVector) - this.getHeading()) % 360 // where wind comes from not where it goes
	}

	getFrictionResistance = () => {
		const speed = Math.sqrt(this.body.velocity.x ** 2 + this.body.velocity.y ** 2);
		const dragCoefficient = 0.0001; // TODO: placeholder value, should be calculated based on the hull shape and other factors
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

