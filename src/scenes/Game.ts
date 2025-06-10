import { Scene, Utils } from 'phaser';
import { Boat } from './objects/boat';
import { vectorGeographicAngle, vectorLength } from './utils/utils';


export class Game extends Scene {
    camera: Phaser.Cameras.Scene2D.Camera
    background: Phaser.GameObjects.TileSprite
    cursors: Phaser.Types.Input.Keyboard.CursorKeys
    boat: Boat
    rect: MatterJS.BodyType
    islands: (Phaser.GameObjects.Ellipse | Phaser.GameObjects.Rectangle)[] = [];
    sailRect: Phaser.GameObjects.Rectangle;
    headingLine: Phaser.GameObjects.Line;
    cogLine: Phaser.GameObjects.Line;
    windParticles: Phaser.GameObjects.Graphics[] = [];

    windVector: { x: number, y: number } = { x: -15, y: 0 };

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
        this.boat.updateWindVector(this.windVector);

        // Mainsail visualisation rectangle
        const sailLength = 50;
        const sailWidth = 6;
        const sailRect = this.add.rectangle(0, 0, sailWidth, sailLength, 0xffffff).setOrigin(0.5, 1);
        sailRect.setDepth(1);
        this.sailRect = sailRect;

        // Heading and COG lines
        const lineLength = 400;
        const headingLine = this.add.line(0, 0, 0, 0, 0, -lineLength, 0xff0000).setOrigin(0.5, 0).setLineWidth(1);
        headingLine.setDepth(2);
        this.headingLine = headingLine;
        const cogLine = this.add.line(0, 0, 0, 0, 0, -lineLength, 0x001a4d).setOrigin(0.5, 0).setLineWidth(1);
        cogLine.setDepth(2);
        this.cogLine = cogLine;

        // // Wind visualization particles
        const windParticleCount = 120;
        this.windParticles = [];
        for (let i = 0; i < windParticleCount; i++) {
            const x = Math.random() * 3000;
            const y = Math.random() * 6000;
            const g = this.add.graphics();
            g.fillStyle(0xffffff, 0.85); // white, more visible
            g.fillEllipse(0, 0, 4, 4); // slightly larger for visibility
            g.alpha = 0.85 + Math.random() * 0.15;
            g.x = x;
            g.y = y;
            g.setDepth(1);
            this.windParticles.push(g);
        }

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
            // Update sail visualisation
            const boatPos = this.boat.sprite;
            const sailAngle = this.boat.sailAngle();
            this.sailRect.x = boatPos.x;
            this.sailRect.y = boatPos.y;
            this.sailRect.rotation = boatPos.rotation + Phaser.Math.DegToRad(sailAngle + 180);

            // Update heading and COG lines
            this.headingLine.x = boatPos.x;
            this.headingLine.y = boatPos.y;
            this.headingLine.rotation = boatPos.rotation;
            this.cogLine.x = boatPos.x;
            this.cogLine.y = boatPos.y;
            this.cogLine.rotation = Phaser.Math.DegToRad(this.boat.getCOG());

            const heading = this.boat.getHeading();
            const cog = this.boat.getCOG();
            const sog = this.boat.getSOG();
            const position = this.boat.getPosition();
            const AWS = this.boat.getAWS()
            const AWA = this.boat.getAWA()


            overlay.setText(`
            Heading: ${heading} 
            COG: ${cog}
            SOG: ${sog}
            Position: ${Math.floor(position.x)}, ${Math.floor(position.y)}
            Wind Vector: ${this.windVector.x.toFixed(2)}, ${this.windVector.y.toFixed(2)}
            TWS: ${vectorLength(this.windVector)} GWD: ${(vectorGeographicAngle(this.windVector) + 180) % 360}
            AWS: ${AWS} AWA: ${AWA}
            Tack: ${this.boat.getTack()}
            Trimmed sail angle: ${this.boat.trimmedSailAngle.toFixed(2)}
            Sail Angle: ${this.boat.sailAngle()}
            Andle of Attack: ${this.boat.getAngleOfAttack()}
            Lift coefficient: ${this.boat.liftCoefficient().toFixed(2)}
            Lift unit vector: ${this.boat.liftUnitVector().x.toFixed(2)}, ${this.boat.liftUnitVector().y.toFixed(2)}
            SailLiftVector: ${this.boat.liftForce().x.toFixed(2)}, ${this.boat.liftForce().y.toFixed(2)}
            Drag unit vector: ${this.boat.dragUnitVector().x.toFixed(2)}, ${this.boat.dragUnitVector().y.toFixed(2)}
            Drag coefficient: ${this.boat.sailDragCoefficient().toFixed(2)}
            SailDragVector: ${this.boat.sailDragForce().x.toFixed(2)}, ${this.boat.sailDragForce().y.toFixed(2)}
            WaterDragVector: ${this.boat.waterDragVector().x.toFixed(2)}, ${this.boat.waterDragVector().y.toFixed(2)}
            AntiDriftVector: ${this.boat.getAntiDriftForce().x.toFixed(2)}, ${this.boat.getAntiDriftForce().y.toFixed(2)}`);

            // Wind particles update
            for (const p of this.windParticles) {
                p.x += this.windVector.x * 0.2;
                p.y += this.windVector.y * 0.2;
                // Wrap around world bounds
                if (p.x < 0) p.x += 3000;
                if (p.x > 3000) p.x -= 3000;
                if (p.y < 0) p.y += 6000;
                if (p.y > 6000) p.y -= 6000;
            }
        });
    }

    update() {
        this.boat.updateWindVector(this.windVector)
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
            this.boat.takeSail(0.12);
        }
        if (sKey.isDown) {
            this.boat.giveSail(0.12);
        }
        if (aKey.isDown) {
            this.boat.applyTorque(-0.005);
        }
        if (dKey.isDown) {
            this.boat.applyTorque(0.005);
        }
    }
}
