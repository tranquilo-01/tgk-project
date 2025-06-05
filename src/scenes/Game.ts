import { Scene } from 'phaser';
import { Boat } from './objects/boat';


export class Game extends Scene {
    camera: Phaser.Cameras.Scene2D.Camera
    background: Phaser.GameObjects.TileSprite
    cursors: Phaser.Types.Input.Keyboard.CursorKeys
    boat: Boat
    rect: MatterJS.BodyType
    islands: (Phaser.GameObjects.Ellipse | Phaser.GameObjects.Rectangle)[] = [];

    GWD: number = 180
    TWS: number = 15


    constructor() {
        super('Game');
    }

    create() {
        // Set world bounds
        this.matter.world.setBounds(0, 0, 3000, 6000);
        this.camera = this.cameras.main;
        // Blue background for sea
        this.add.rectangle(1500, 3000, 3000, 6000, 0x1e90ff).setDepth(-2);
        this.background = this.add.tileSprite(0, 0, 10000, 10000, 'sea').setVisible(false); // Hide old background

        // Generate green islands (static bodies)
        this.islands = [];
        // More, denser, and varied islands
        const islandData = [
            // Ellipses
            { x: 600, y: 1200, r: 180, shape: 'ellipse' },
            { x: 2200, y: 800, r: 140, shape: 'ellipse' },
            { x: 1500, y: 3000, r: 220, shape: 'ellipse' },
            { x: 900, y: 5000, r: 160, shape: 'ellipse' },
            { x: 2500, y: 4000, r: 200, shape: 'ellipse' },
            { x: 800, y: 2000, r: 120, shape: 'ellipse' },
            { x: 2100, y: 1800, r: 110, shape: 'ellipse' },
            { x: 1200, y: 4000, r: 130, shape: 'ellipse' },
            { x: 1800, y: 5000, r: 100, shape: 'ellipse' },
            { x: 2300, y: 5200, r: 120, shape: 'ellipse' },
            // Rectangles
            { x: 1000, y: 2500, w: 300, h: 120, shape: 'rect' },
            { x: 2000, y: 3500, w: 200, h: 180, shape: 'rect' },
            { x: 1700, y: 1500, w: 250, h: 100, shape: 'rect' },
            { x: 600, y: 3500, w: 180, h: 180, shape: 'rect' },
            { x: 2500, y: 2500, w: 220, h: 120, shape: 'rect' },
            { x: 1300, y: 1000, w: 180, h: 180, shape: 'rect' },
            { x: 2000, y: 4700, w: 200, h: 120, shape: 'rect' },
            { x: 700, y: 4200, w: 160, h: 160, shape: 'rect' },
            { x: 2300, y: 3200, w: 180, h: 180, shape: 'rect' },
        ];
        islandData.forEach(isle => {
            let island: Phaser.GameObjects.Ellipse | Phaser.GameObjects.Rectangle | undefined;
            if (isle.shape === 'ellipse' && typeof isle.r === 'number') {
                island = this.add.ellipse(isle.x, isle.y, isle.r * 2, isle.r * 2, 0x228B22).setDepth(-1);
                this.matter.add.gameObject(island, { shape: { type: 'circle', radius: isle.r }, isStatic: true });
            } else if (isle.shape === 'rect' && typeof isle.w === 'number' && typeof isle.h === 'number') {
                island = this.add.rectangle(isle.x, isle.y, isle.w, isle.h, 0x228B22).setDepth(-1);
                this.matter.add.gameObject(island, { shape: { type: 'rectangle', width: isle.w, height: isle.h }, isStatic: true });
            }
            if (island) this.islands.push(island);
        });

        // Replace old Boat creation with sprite-based Boat
        this.boat = new Boat(this, 1500, 5900, 20, 30, 12000, 4.5);
        this.boat.updateWindData(this.TWS, this.GWD);

        this.registerWSAD();

        const style = { font: '16px Arial', fill: '#ffffff' };
        const overlay = this.add.text(10, 10, '', style).setScrollFactor(0);

        // Collision with islands or world bounds ends game
        this.matter.world.on('collisionstart', (event: any) => {
            event.pairs.forEach((pair: any) => {
                if (
                    (pair.bodyA === this.boat.body && this.islands.some(isle => isle.body === pair.bodyB)) ||
                    (pair.bodyB === this.boat.body && this.islands.some(isle => isle.body === pair.bodyA))
                ) {
                    this.scene.start('GameOver');
                }
            });
        });
        // World bounds collision
        this.boat.body.onCollideCallback = (data: any) => {
            if (data.bodyB.isStatic && data.bodyB.label === 'Rectangle Body') {
                this.scene.start('GameOver');
            }
        };

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
        this.camera.centerOn(this.boat.getPosition().x, this.boat.getPosition().y - 250);
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
            this.boat.applyTorque(-0.005);
        }
        if (dKey.isDown) {
            this.boat.applyTorque(0.005);
        }
    }
}
