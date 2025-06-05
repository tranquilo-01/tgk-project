import { Scene } from 'phaser';
import { Boat } from './objects/boat';
import * as utils from './utils/utils';


export class Game extends Scene {
    camera: Phaser.Cameras.Scene2D.Camera
    background: Phaser.GameObjects.TileSprite
    cursors: Phaser.Types.Input.Keyboard.CursorKeys
    boat: Boat
    rect: MatterJS.BodyType

    GWD: number = 90
    TWS: number = 15


    constructor() {
        super('Game');
    }

    create() {
        this.camera = this.cameras.main
        this.background = this.add.tileSprite(0, 0, 10000, 10000, 'sea');
        this.boat = new Boat(this.matter.add.trapezoid(0, 0, 20, 30, 0.5), 20, 30, 12000, 4.5);
        this.boat.updateWindData(this.TWS, this.GWD)

        this.registerWSAD()

        const style = { font: '16px Arial', fill: '#ffffff' };
        const overlay = this.add.text(10, 10, '', style).setScrollFactor(0);

        this.events.on('update', () => {
            const heading = this.boat.getHeading();
            const cog = this.boat.getCOG();
            const sog = this.boat.getSOG();
            const position = this.boat.getPosition();
            const TWS = this.TWS
            const GWD = this.GWD
            const AWS = this.boat.getAWS()
            const AWA = this.boat.getAWA()


            overlay.setText(`
            Heading: ${heading}
            COG: ${cog}
            SOG: ${sog}
            Position: ${Math.floor(position.x)}, ${Math.floor(position.y)}
            TWS: ${TWS} GWD: ${GWD}
            AWS: ${AWS} AWA: ${AWA}
            Tack: ${this.boat.getTack()}
            Sail Angle: ${this.boat.getSailAngle(AWA)}
            Andle of Attack: ${this.boat.getAngleOfAttack()}
            ApparentWind: ${AWS.toFixed(2)}, ${AWA.toFixed(2)}
            SailLiftVector: ${this.boat.getLiftForce().x.toFixed(2)}, ${this.boat.getLiftForce().y.toFixed(2)}
            SailDragVector: ${this.boat.getDragForce().x.toFixed(2)}, ${this.boat.getDragForce().y.toFixed(2)}
            WaterDragVector: ${this.boat.getWaterDragVector().x.toFixed(2)}, ${this.boat.getWaterDragVector().y.toFixed(2)}
            AntiDriftVector: ${this.boat.getAntiDriftForce().x.toFixed(2)}, ${this.boat.getAntiDriftForce().y.toFixed(2)}`);

        });
    }

    update() {
        this.boat.updateWindData(this.TWS, this.GWD)
        this.moveWithWSAD()
        this.boat.applyFrictionForces()
        this.boat.applySailForces()
        // this.camera.setScroll(this.boat.getPosition().x - this.scale.height / 2, this.boat.getPosition().y - this.scale.width / 2)
        this.camera.centerOn(this.boat.getPosition().x, this.boat.getPosition().y);
    }

    registerWSAD() {
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W)
        this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S)
        this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A)
        this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    }

    moveWithWSAD() {
        const wKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        const sKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        const aKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        const dKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);

        // const rotation = object.angle;

        // const forceMagnitude = 5; // Adjust the force magnitude as needed
        // const forceX = Math.sin(rotation) * forceMagnitude;
        // const forceY = -Math.cos(rotation) * forceMagnitude;

        if (wKey.isDown) {
            this.boat.takeSail(0.08);
        }
        if (sKey.isDown) {
            this.boat.giveSail(0.08);
        }
        if (aKey.isDown) {
            this.boat.applyTorque(-0.0003);
        }
        if (dKey.isDown) {
            this.boat.applyTorque(0.0003);
        }
    }
}
