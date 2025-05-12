import { Scene } from 'phaser';
import { Boat } from './objects/boat';

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
        this.boat = new Boat(this.matter.add.trapezoid(0, 0, 20, 30, 0.5), 20, 30, 12000)

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
            const AWS = this.boat.getAWS(GWD, TWS)
            const AWA = this.boat.getAWA(GWD, TWS)


            overlay.setText(`Heading: ${heading}\nCOG: ${cog}\nSOG: ${sog}\nPosition: ${Math.floor(position.x)}, ${Math.floor(position.y)}\nTWS: ${TWS}\nGWD: ${GWD}\nAWS: ${AWS} AWA: ${AWA}`);
        });
    }

    update() {
        this.moveWithWSAD(this.boat.body)
        this.boat.applyFrictionForces()
        this.camera.setScroll(this.boat.getPosition().x - this.camera.height / 2, this.boat.getPosition().y - this.camera.width / 2)
    }

    registerWSAD() {
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W)
        this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S)
        this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A)
        this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    }

    moveWithWSAD(object: MatterJS.BodyType) {
        const wKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        const sKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        const aKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        const dKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);

        const rotation = object.angle;

        const forceMagnitude = 3; // Adjust the force magnitude as needed
        const forceX = Math.sin(rotation) * forceMagnitude;
        const forceY = -Math.cos(rotation) * forceMagnitude;

        if (wKey.isDown) {
            this.boat.applyForce({ x: forceX, y: forceY });
        }
        if (sKey.isDown) {
            this.boat.applyForce({ x: -forceX, y: -forceY });
        }
        if (aKey.isDown) {
            this.boat.rotate(-0.001);
        }
        if (dKey.isDown) {
            this.boat.rotate(0.001);
        }
    }
}
