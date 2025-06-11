import { Scene } from 'phaser';
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
    windVector: { x: number, y: number } = { x: -5, y: 15 };
    debugOverlay: Phaser.GameObjects.Text | null = null; // Debug overlay text
    isDebugOverlay: boolean = false; // Flag to toggle debug overlay

    // Data View Overlay Elements
    dataViewOverlayContainer: Phaser.GameObjects.Container;
    timeValueText: Phaser.GameObjects.Text;
    sogValueText: Phaser.GameObjects.Text;
    headingValueText: Phaser.GameObjects.Text;
    cogValueText: Phaser.GameObjects.Text;
    twsValueText: Phaser.GameObjects.Text;
    gwdValueText: Phaser.GameObjects.Text;
    awsValueText: Phaser.GameObjects.Text;
    awaValueText: Phaser.GameObjects.Text;

    trimmedSailAngleSliderTrack: Phaser.GameObjects.Graphics;
    trimmedSailAngleSliderHandle: Phaser.GameObjects.Graphics;
    trimmedSailAngleValueText: Phaser.GameObjects.Text;

    sailAngleSliderTrack: Phaser.GameObjects.Graphics;
    sailAngleSliderHandle: Phaser.GameObjects.Graphics;
    sailAngleValueText: Phaser.GameObjects.Text;

    gameTime: number = 0; // To keep track of elapsed time

    // Store slider dimensions for later use
    private sliderTrackWidthConst: number;
    private sliderTrackHeightConst: number;
    private sliderHandleWidthConst: number;
    private sliderHandleHeightConst: number;

    // Level specific properties
    private currentLevel: number = 1;
    private gameStarted: boolean = false;
    private pressSpaceText: Phaser.GameObjects.Text;
    private restartLevelButton: Phaser.GameObjects.Text; // Added for restart button
    private finishLine: {
        startDot: Phaser.GameObjects.Ellipse,
        endDot: Phaser.GameObjects.Ellipse,
        line: Phaser.Geom.Line,
        graphics: Phaser.GameObjects.Graphics // For visualizing the line if needed
    };
    private levelStartTime: number = 0;
    private boatPreviousY: number; // For finish line check

    constructor() {
        super('Game');
    }

    init(data: { level?: number }) {
        this.currentLevel = data.level || 1;
        this.gameStarted = false; // Reset game started state
        this.gameTime = 0; // Reset game time for the level
    }

    create() {
        // Set world bounds explicitly, as matter.world.setBounds doesn't always reflect in localWorld.bounds as expected for width/height queries later.
        const worldWidth = 3000;
        const worldHeight = 6000;
        this.matter.world.setBounds(0, 0, worldWidth, worldHeight);
        this.camera = this.cameras.main;
        // Light blue background for sea (overall background)
        this.add.rectangle(1500, 3000, 3000, 6000, 0xd1fdfc).setDepth(-3); // Deepest layer
        this.background = this.add.tileSprite(0, 0, 10000, 10000, 'sea').setVisible(false); // Hide old background

        // Generate green islands (static bodies)
        this.islands = [];
        // Fewer, larger, and more irregular islands
        const islandData = [
            // Large main island mass (composed of several overlapping ellipses)
            { x: 800, y: 1500, r: 400, shape: 'ellipse' },
            { x: 1200, y: 1700, r: 350, shape: 'ellipse' },
            { x: 900, y: 2000, r: 300, shape: 'ellipse' },
            { x: 600, y: 1800, r: 250, shape: 'ellipse' },

            // Second large island mass
            { x: 2200, y: 3500, r: 500, shape: 'ellipse' },
            { x: 2500, y: 3800, r: 400, shape: 'ellipse' },
            { x: 2000, y: 3200, r: 300, shape: 'ellipse' },

            // Smaller, irregular islands
            { x: 500, y: 4500, r: 250, shape: 'ellipse' },
            { x: 700, y: 4700, r: 180, shape: 'ellipse' },

            { x: 1800, y: 800, r: 220, shape: 'ellipse' },
            { x: 2000, y: 600, r: 180, shape: 'ellipse' },

            // A more rectangular-like feature using ellipses
            { x: 1500, y: 5000, r: 150, shape: 'ellipse' },
            { x: 1600, y: 5050, r: 150, shape: 'ellipse' },
            { x: 1400, y: 4950, r: 150, shape: 'ellipse' },

            // Some smaller "rocks" or islets
            { x: 2800, y: 1200, r: 80, shape: 'ellipse' },
            { x: 2700, y: 5200, r: 100, shape: 'ellipse' },
            { x: 300, y: 800, r: 90, shape: 'ellipse' },
        ];

        const shoalColor = 0x7ad9f7;
        const islandColor = 0xc8cc9c;
        const contourColor = 0x000000;
        const contourThickness = 0.5;
        const shoalDepth = -2; // Above sea, below islands
        const islandDepth = -1; // Above shoals

        islandData.forEach(isle => {
            if (isle.shape === 'ellipse' && typeof isle.r === 'number') {
                // Add shoal layer first (larger radius)
                const shoalRadius = isle.r * 1.3; // Shoal is 30% larger than the island part
                this.add.ellipse(isle.x, isle.y, shoalRadius * 2, shoalRadius * 2, shoalColor)
                    .setStrokeStyle(contourThickness, contourColor)
                    .setDepth(shoalDepth);

                // Add island layer on top of the shoal
                const islandSprite = this.add.ellipse(isle.x, isle.y, isle.r * 2, isle.r * 2, islandColor)
                    .setStrokeStyle(contourThickness, contourColor)
                    .setDepth(islandDepth);

                this.matter.add.gameObject(islandSprite, { shape: { type: 'circle', radius: isle.r }, isStatic: true });
                this.islands.push(islandSprite);
            }
        });

        // Replace old Boat creation with sprite-based Boat
        this.boat = new Boat(this, 1500, 5700, 20, 30, 12000, 4.5);
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
            g.fillStyle(0x6b81fa, 0.85); // white, more visible
            g.fillEllipse(0, 0, 4, 4); // slightly larger for visibility
            g.alpha = 0.85 + Math.random() * 0.15;
            g.x = x;
            g.y = y;
            g.setDepth(1);
            this.windParticles.push(g);
        }

        this.registerWSAD();

        // Initialize debug overlay
        if (this.isDebugOverlay) {
            const style = { font: '16px Arial', fill: '#ffffff', backgroundColor: 'rgba(0,0,0,0.5)', padding: { x: 0, y: 0 } };
            this.debugOverlay = this.add.text(10, 10, '', style).setScrollFactor(0).setDepth(10);
        }


        // Consolidated collision handling
        this.matter.world.on('collisionstart', (event: Phaser.Physics.Matter.Events.CollisionStartEvent) => {
            event.pairs.forEach((pair: Phaser.Types.Physics.Matter.MatterCollisionPair) => {
                const bodyA = pair.bodyA as MatterJS.BodyType;
                const bodyB = pair.bodyB as MatterJS.BodyType;
                const walls = this.matter.world.walls;

                let isBoatInvolved = false;
                let otherBodyForBoat: MatterJS.BodyType | null = null;

                if (bodyA === this.boat.body) {
                    isBoatInvolved = true;
                    otherBodyForBoat = bodyB;
                } else if (bodyB === this.boat.body) {
                    isBoatInvolved = true;
                    otherBodyForBoat = bodyA;
                }

                if (isBoatInvolved && otherBodyForBoat) {
                    const triggerGameOver = () => {
                        if (this.sys.isActive()) { // Check if current scene is active
                            if (this.restartLevelButton) this.restartLevelButton.setVisible(false);
                            this.matter.world.pause(); // Pause physics before switching scenes
                            this.scene.start('GameOver', { level: this.currentLevel, time: this.gameTime });
                        }
                    };

                    // Check for island collision
                    if (this.islands.some(isle => isle.body === otherBodyForBoat)) {
                        triggerGameOver();
                        return; // Collision handled
                    }

                    // Check for world wall collision
                    if (walls && otherBodyForBoat.isStatic &&
                        (otherBodyForBoat === walls.left ||
                            otherBodyForBoat === walls.right ||
                            otherBodyForBoat === walls.top ||
                            otherBodyForBoat === walls.bottom)) {
                        triggerGameOver();
                        return; // Collision handled
                    }
                }
            });
        });
        // World bounds collision (Removed: this.boat.body.onCollideCallback)

        this._createDataViewOverlayElements();

        // "Press Space to Start" text
        this.pressSpaceText = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, 'Press SPACE to Start', {
            fontFamily: 'Arial', fontSize: '48px', color: '#ffffff', stroke: '#000000', strokeThickness: 6, align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(30);

        // Finish Line - at the top of the map
        const finishLineY = 100;
        const finishLineMargin = 200;
        // Use the worldWidth defined at the start of create()
        this.finishLine = {
            startDot: this.add.ellipse(finishLineMargin, finishLineY, 20, 20, 0xff0000).setDepth(5),
            endDot: this.add.ellipse(worldWidth - finishLineMargin, finishLineY, 20, 20, 0xff0000).setDepth(5),
            line: new Phaser.Geom.Line(finishLineMargin, finishLineY, worldWidth - finishLineMargin, finishLineY),
            graphics: this.add.graphics({ lineStyle: { width: 5, color: 0xff0000 } }).setDepth(5)
        };
        this.finishLine.graphics.strokeLineShape(this.finishLine.line);

        // Pause physics initially
        this.matter.world.pause();

        if (this.input.keyboard) {
            this.input.keyboard.on('keydown-SPACE', () => {
                if (!this.gameStarted) {
                    this.startGame();
                }
            });
        } else {
            console.error("Keyboard input not available for spacebar.");
        }
        // Initialize boatPreviousY with the boat's starting y position
        this.boatPreviousY = this.boat.getPosition().y;

        // Restart Level Button
        const buttonPadding = 15;
        this.restartLevelButton = this.add.text(buttonPadding, buttonPadding, 'Restart Level', {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#ffffff',
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: { x: 10, y: 5 }
        })
            .setScrollFactor(0)
            .setDepth(30)
            .setInteractive()
            .setVisible(false); // Initially hidden

        this.restartLevelButton.on('pointerdown', () => {
            if (this.gameStarted) { // Only allow restart if game is active
                this.scene.start('Game', { level: this.currentLevel });
            }
        });
    }

    private startGame() {
        this.gameStarted = true;
        this.pressSpaceText.setVisible(false);
        if (this.restartLevelButton) this.restartLevelButton.setVisible(true); // Show restart button
        this.matter.world.resume();
        this.levelStartTime = this.gameTime; // Record start time when space is pressed
        this.boatPreviousY = this.boat.getPosition().y; // Ensure this is set when the game actually starts moving
    }

    update(_time: number, delta: number) { // time parameter is used by Phaser, but not directly in this function body, marked as _time
        const currentBoatY = this.boat.getPosition().y;
        if (!this.gameStarted) {
            // Game hasn't started, camera might be fixed or follow a pre-defined path
            // For now, let's keep it centered on where the boat will be, but boat is not moving
            this.camera.centerOn(this.boat.getPosition().x, this.boat.getPosition().y - 250);
            this._updateDataViewOverlay(); // Keep overlay updated even if game is paused
            return; // Don't run game logic if not started
        }

        this.gameTime += delta / 1000; // Update game time in seconds

        this.boat.updateWindVector(this.windVector)
        this.moveWithWSAD()
        this.boat.applyFrictionForces()
        this.boat.applySailForces()
        this.camera.centerOn(this.boat.getPosition().x, this.boat.getPosition().y - 250);
        this.updateSailVisualisation();
        this.updateCourseLines();
        this.updateWindParticles();

        if (this.debugOverlay) {
            this.debugOverlay.setVisible(this.isDebugOverlay);
        }
        if (this.isDebugOverlay && this.debugOverlay) { // Ensure overlay exists before updating
            this.displayDebugOverlay();
        }

        this._updateDataViewOverlay();
        this.checkFinishLine(currentBoatY);
        this.boatPreviousY = currentBoatY; // Update previous Y for the next frame's check
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

        if (wKey.isDown) {
            this.boat.takeSail(0.15);
        }
        if (sKey.isDown) {
            this.boat.giveSail(0.15);
        }
        if (aKey.isDown) {
            this.boat.applyTorque(-0.008);
        }
        if (dKey.isDown) {
            this.boat.applyTorque(0.008);
        }
    }

    updateCourseLines() {
        // Update heading and COG lines
        const boatPos = this.boat.sprite;
        this.headingLine.x = boatPos.x;
        this.headingLine.y = boatPos.y;
        this.headingLine.rotation = boatPos.rotation;
        this.cogLine.x = boatPos.x;
        this.cogLine.y = boatPos.y;
        this.cogLine.rotation = Phaser.Math.DegToRad(this.boat.getCOG());
    }

    updateSailVisualisation() {
        // Update sail visualisation
        const boatPos = this.boat.sprite;
        const sailAngle = this.boat.sailAngle();
        this.sailRect.x = boatPos.x;
        this.sailRect.y = boatPos.y;
        this.sailRect.rotation = boatPos.rotation + Phaser.Math.DegToRad(sailAngle + 180);
    }

    updateWindParticles() {
        // Update wind particles
        for (const p of this.windParticles) {
            p.x += this.windVector.x * 0.5;
            p.y += this.windVector.y * 0.5;
            // Wrap around world bounds
            if (p.x < 0) p.x += 3000;
            if (p.x > 3000) p.x -= 3000;
            if (p.y < 0) p.y += 6000;
            if (p.y > 6000) p.y -= 6000;
        }
    }

    displayDebugOverlay() {
        this.debugOverlay!.setText(`
        Heading: ${this.boat.getHeading()} 
        COG: ${this.boat.getCOG()}
        SOG: ${this.boat.getSOG().toFixed(2)}
        Position: ${Math.floor(this.boat.body.position.x)}, ${Math.floor(this.boat.body.position.y)}
        Wind Vector: ${this.windVector.x.toFixed(2)}, ${this.windVector.y.toFixed(2)}
        TWS: ${vectorLength(this.windVector)} GWD: ${(vectorGeographicAngle(this.windVector) + 180) % 360}
        AWS: ${this.boat.getAWS()} AWA: ${this.boat.getAWA()}
        Tack: ${this.boat.getTack()}
        Trimmed sail angle: ${this.boat.trimmedSailAngle.toFixed(2)}
        Sail Angle: ${this.boat.sailAngle().toFixed(0)}
        Angle of Attack: ${this.boat.getAngleOfAttack().toFixed(0)}
        Lift coefficient: ${this.boat.liftCoefficient().toFixed(2)}
        Lift unit vector: ${this.boat.liftUnitVector().x.toFixed(2)}, ${this.boat.liftUnitVector().y.toFixed(2)}
        SailLiftVector: ${this.boat.liftForce().x.toFixed(2)}, ${this.boat.liftForce().y.toFixed(2)}
        Drag unit vector: ${this.boat.dragUnitVector().x.toFixed(2)}, ${this.boat.dragUnitVector().y.toFixed(2)}
        Drag coefficient: ${this.boat.sailDragCoefficient().toFixed(2)}
        SailDragVector: ${this.boat.sailDragForce().x.toFixed(2)}, ${this.boat.sailDragForce().y.toFixed(2)}
        WaterDragVector: ${this.boat.waterDragVector().x.toFixed(2)}, ${this.boat.waterDragVector().y.toFixed(2)}
        AntiDriftVector: ${this.boat.getAntiDriftForce().x.toFixed(2)}, ${this.boat.getAntiDriftForce().y.toFixed(2)}`);
    }

    private _createDataViewOverlayElements() {
        this.gameTime = 0;
        const overlayWidth = 350; // Increased width
        const overlayHeight = 320; // Increased height
        const padding = 10;
        const screenWidth = this.scale.width;

        this.dataViewOverlayContainer = this.add.container(screenWidth - overlayWidth - padding, padding);
        this.dataViewOverlayContainer.setScrollFactor(0).setDepth(20);

        const background = this.add.graphics();
        background.fillStyle(0x000000, 0.6);
        background.fillRect(0, 0, overlayWidth, overlayHeight);
        this.dataViewOverlayContainer.add(background);

        const labelStyle = { font: '14px Arial', fill: '#cccccc' }; // Slightly larger label font
        const valueStyle = { font: '24px Arial', fill: '#ffffff' }; // Slightly larger value font
        const valueStyleRight = { ...valueStyle, align: 'right' as 'right' };
        const sliderValueStyle = { font: '16px Arial', fill: '#ffffff' }; // Slightly larger slider value font


        let currentY = padding;
        const col1X = padding;
        const col2X = overlayWidth / 2 + padding / 2;
        const colWidth = overlayWidth / 2 - padding * 1.5;


        // Row 1: Time | SOG
        this.dataViewOverlayContainer.add(this.add.text(col1X, currentY, "TIME", labelStyle));
        this.dataViewOverlayContainer.add(this.add.text(col2X, currentY, "SOG", labelStyle));
        currentY += 18; // Adjusted spacing
        this.timeValueText = this.add.text(col1X, currentY, "00:00:00", valueStyle);
        this.sogValueText = this.add.text(col2X + colWidth, currentY, "0.0kts", valueStyleRight).setOrigin(1, 0);
        this.dataViewOverlayContainer.add([this.timeValueText, this.sogValueText]);
        currentY += 30; // Adjusted spacing

        // Row 2: Heading | COG
        this.dataViewOverlayContainer.add(this.add.text(col1X, currentY, "HEADING", labelStyle));
        this.dataViewOverlayContainer.add(this.add.text(col2X, currentY, "COG", labelStyle));
        currentY += 18; // Adjusted spacing
        this.headingValueText = this.add.text(col1X, currentY, "0°", valueStyle);
        this.cogValueText = this.add.text(col2X + colWidth, currentY, "0°", valueStyleRight).setOrigin(1, 0);
        this.dataViewOverlayContainer.add([this.headingValueText, this.cogValueText]);
        currentY += 30; // Adjusted spacing

        // Row 3: TWS | GWD
        this.dataViewOverlayContainer.add(this.add.text(col1X, currentY, "TWS", labelStyle));
        this.dataViewOverlayContainer.add(this.add.text(col2X, currentY, "GWD", labelStyle));
        currentY += 18; // Adjusted spacing
        this.twsValueText = this.add.text(col1X, currentY, "0.0kts", valueStyle);
        this.gwdValueText = this.add.text(col2X + colWidth, currentY, "0°", valueStyleRight).setOrigin(1, 0);
        this.dataViewOverlayContainer.add([this.twsValueText, this.gwdValueText]);
        currentY += 30; // Adjusted spacing

        // Row 4: AWS | AWA
        this.dataViewOverlayContainer.add(this.add.text(col1X, currentY, "AWS", labelStyle));
        this.dataViewOverlayContainer.add(this.add.text(col2X, currentY, "AWA", labelStyle));
        currentY += 18; // Adjusted spacing
        this.awsValueText = this.add.text(col1X, currentY, "0.0kts", valueStyle);
        this.awaValueText = this.add.text(col2X + colWidth, currentY, "0°", valueStyleRight).setOrigin(1, 0);
        this.dataViewOverlayContainer.add([this.awsValueText, this.awaValueText]);
        currentY += 35; // More space before sliders

        // Sliders
        this.sliderTrackWidthConst = overlayWidth - padding * 2;
        this.sliderTrackHeightConst = 10; // Slightly thicker track
        this.sliderHandleWidthConst = 8; // Slightly wider handle
        this.sliderHandleHeightConst = 20; // Slightly taller handle

        // Trimmed Sail Angle Slider
        this.dataViewOverlayContainer.add(this.add.text(col1X, currentY, "TRIMMED SAIL ANGLE", labelStyle));
        this.trimmedSailAngleValueText = this.add.text(col1X + this.sliderTrackWidthConst, currentY + 2, "0°", sliderValueStyle).setOrigin(1, 0);
        this.dataViewOverlayContainer.add(this.trimmedSailAngleValueText);
        currentY += 20; // Adjusted spacing
        this.trimmedSailAngleSliderTrack = this.add.graphics().fillStyle(0x444444).fillRect(0, 0, this.sliderTrackWidthConst, this.sliderTrackHeightConst);
        this.trimmedSailAngleSliderTrack.setPosition(col1X, currentY);
        this.trimmedSailAngleSliderHandle = this.add.graphics().fillStyle(0xeeeeee).fillRect(0, - (this.sliderHandleHeightConst - this.sliderTrackHeightConst) / 2, this.sliderHandleWidthConst, this.sliderHandleHeightConst);
        this.dataViewOverlayContainer.add([this.trimmedSailAngleSliderTrack, this.trimmedSailAngleSliderHandle]);
        currentY += this.sliderTrackHeightConst + 18; // Adjusted spacing


        // Sail Angle Slider
        this.dataViewOverlayContainer.add(this.add.text(col1X, currentY, "SAIL ANGLE", labelStyle));
        this.sailAngleValueText = this.add.text(col1X + this.sliderTrackWidthConst, currentY + 2, "0°", sliderValueStyle).setOrigin(1, 0);
        this.dataViewOverlayContainer.add(this.sailAngleValueText);
        currentY += 20; // Adjusted spacing
        this.sailAngleSliderTrack = this.add.graphics().fillStyle(0x444444).fillRect(0, 0, this.sliderTrackWidthConst, this.sliderTrackHeightConst);
        this.sailAngleSliderTrack.setPosition(col1X, currentY);
        this.sailAngleSliderHandle = this.add.graphics().fillStyle(0xeeeeee).fillRect(0, -(this.sliderHandleHeightConst - this.sliderTrackHeightConst) / 2, this.sliderHandleWidthConst, this.sliderHandleHeightConst);
        this.dataViewOverlayContainer.add([this.sailAngleSliderTrack, this.sailAngleSliderHandle]);
    }

    private _updateDataViewOverlay() {
        if (!this.boat || !this.dataViewOverlayContainer) return;

        // Update Time - show level time if game started, else total game session time or 00:00:00
        const displayTime = this.gameStarted ? this.gameTime - this.levelStartTime : 0;
        const totalSeconds = Math.floor(displayTime);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        this.timeValueText.setText(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);

        // Update Boat Data
        this.sogValueText.setText(`${this.boat.getSOG().toFixed(1)}kts`);
        this.headingValueText.setText(`${this.boat.getHeading()}°`);
        this.cogValueText.setText(`${this.boat.getCOG()}°`);

        // Update Wind Data
        const tws = vectorLength(this.windVector);
        const gwd = (vectorGeographicAngle(this.windVector) + 180) % 360; // Assuming windVector is 'coming from'
        this.twsValueText.setText(`${tws.toFixed(1)}kts`);
        this.gwdValueText.setText(`${Math.round(gwd)}°`);
        this.awsValueText.setText(`${this.boat.getAWS().toFixed(1)}kts`);
        this.awaValueText.setText(`${this.boat.getAWA()}°`);

        // Update Sliders
        // const sliderTrackWidth = this.trimmedSailAngleSliderTrack.width; // Use stored constant

        const trimmedSailAngle = this.boat.trimmedSailAngle; // 0-90
        const trimmedHandleX = this.trimmedSailAngleSliderTrack.x + (trimmedSailAngle / 90) * (this.sliderTrackWidthConst - this.sliderHandleWidthConst);
        this.trimmedSailAngleSliderHandle.setPosition(trimmedHandleX, this.trimmedSailAngleSliderTrack.y + this.sliderTrackHeightConst / 2);
        this.trimmedSailAngleValueText.setText(`${trimmedSailAngle.toFixed(0)}°`);

        const sailAngle = Math.abs(this.boat.sailAngle()); // 0-90
        const sailHandleX = this.sailAngleSliderTrack.x + (sailAngle / 90) * (this.sliderTrackWidthConst - this.sliderHandleWidthConst);
        this.sailAngleSliderHandle.setPosition(sailHandleX, this.sailAngleSliderTrack.y + this.sliderTrackHeightConst / 2);
        this.sailAngleValueText.setText(`${sailAngle.toFixed(0)}°`);
    }

    private checkFinishLine(currentBoatY: number) {
        if (!this.gameStarted) return;

        const boatPositionX = this.boat.getPosition().x;

        // Check if the boat crossed the line in the northward direction
        if (currentBoatY < this.finishLine.line.y1 &&
            this.boatPreviousY >= this.finishLine.line.y1 && // Ensures crossing happened in this frame
            boatPositionX >= this.finishLine.line.x1 &&
            boatPositionX <= this.finishLine.line.x2) {
            this.levelCompleted();
        }
    }

    private levelCompleted() {
        this.gameStarted = false;
        this.matter.world.pause(); // Pause physics
        if (this.restartLevelButton) {
            this.restartLevelButton.setVisible(false); // Hide restart button
        }

        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;

        const elapsedTime = this.gameTime - this.levelStartTime;
        const totalSeconds = Math.floor(elapsedTime);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        // Background for the message
        this.add.rectangle(centerX, centerY, 450, 250, 0x000000, 0.8)
            .setScrollFactor(0)
            .setDepth(30);

        this.add.text(centerX, centerY - 60, `Level ${this.currentLevel} Completed!`, {
            fontFamily: 'Arial', fontSize: '32px', color: '#ffffff', align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(31);

        this.add.text(centerX, centerY - 10, `Time: ${timeString}`, {
            fontFamily: 'Arial', fontSize: '24px', color: '#ffffff', align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(31);

        const mainMenuButton = this.add.text(centerX, centerY + 60, 'Main Menu', {
            fontFamily: 'Arial', fontSize: '24px', color: '#00ff00', backgroundColor: '#333333',
            padding: { x: 15, y: 8 }, align: 'center'
        })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(31)
            .setInteractive();

        mainMenuButton.on('pointerdown', () => {
            this.scene.start('MainMenu');
        });

        // Future: Add "Next Level" button here if applicable
    }
}
