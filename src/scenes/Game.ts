import { Scene } from 'phaser';
import * as utils from './utils/utils';

export class Game extends Scene {
    camera: Phaser.Cameras.Scene2D.Camera
    background: Phaser.GameObjects.TileSprite
    cursors: Phaser.Types.Input.Keyboard.CursorKeys
    boat: MatterJS.BodyType
    rect: MatterJS.BodyType

    GWD: number = 90
    TWS: number = 15


    constructor() {
        super('Game');
    }

    create() {
        this.camera = this.cameras.main
        this.camera.centerOn(0, 0)


        // this.boat.frictionAir = 0.07



        this.boat = this.matter.add.rectangle(40, 40, 10, 30)
        this.boat = this.matter.add.trapezoid(0, 0, 20, 30, 0.5);

        // this.camera.startFollow(this.boat, false, 0.05, 0.05, 0, 0);

        this.registerWSAD()

        const style = { font: '16px Arial', fill: '#ffffff' };
        const overlay = this.add.text(10, 10, '', style).setScrollFactor(0);

        this.events.on('update', () => {
            const heading = utils.calculateHdg(this.boat);
            const cog = utils.calculateCOG(this.boat);
            const sog = utils.calculateSOG(this.boat);
            const position = utils.calculatePosition(this.boat);
            const TWS = this.TWS
            const GWD = this.GWD
            const AWS = utils.calculateAWS(this.boat, GWD, TWS)
            const AWA = utils.calculateAWA(this.boat, GWD)

            overlay.setText(`Heading: ${heading}\nCOG: ${cog}\nSOG: ${sog}\nPosition: ${position}\nTWS: ${TWS}\nGWD: ${GWD}\nAWS: ${AWS} AWA: ${AWA}`);
        });
    }

    update() {
        this.moveWithWSAD(this.boat)
        this.camera.setScroll(this.boat.position.x - this.camera.height / 2, this.boat.position.y - this.camera.width / 2)
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

        const forceMagnitude = 1 / (object.mass * 10000);
        const forceX = Math.sin(rotation) * forceMagnitude;
        const forceY = -Math.cos(rotation) * forceMagnitude;

        if (wKey.isDown) {
            this.matter.body.applyForce(object, object.position, { x: forceX, y: forceY });
        }
        if (sKey.isDown) {
            this.matter.body.applyForce(object, object.position, { x: -forceX, y: -forceY });
        }
        if (aKey.isDown) {
            this.matter.body.rotate(object, -0.01);
        }
        if (dKey.isDown) {
            this.matter.body.rotate(object, 0.01);
        }
    }
}
