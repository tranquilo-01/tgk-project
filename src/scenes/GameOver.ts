import { Scene } from 'phaser';

export class GameOver extends Scene {
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    gameover_text: Phaser.GameObjects.Text;
    retryButton: Phaser.GameObjects.Text;
    mainMenuButton: Phaser.GameObjects.Text;
    level: number;
    levelTimePassed: number; // Renamed from time to avoid conflict with Scene.time

    constructor() {
        super('GameOver');
    }

    init(data: { level: number, time: number }) {
        this.level = data.level;
        this.levelTimePassed = data.time; // Store the passed time
    }

    create() {
        this.camera = this.cameras.main
        this.camera.setBackgroundColor(0x330000); // Darker red

        // Optional: Display a semi-transparent overlay
        const overlay = this.add.rectangle(this.cameras.main.centerX, this.cameras.main.centerY, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.5);
        overlay.setOrigin(0.5);

        this.gameover_text = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY - 100, 'Game Over', {
            fontFamily: 'Arial Black', fontSize: 64, color: '#ff0000',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        });
        this.gameover_text.setOrigin(0.5);

        // Retry Button
        this.retryButton = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY + 50, 'Retry Level', {
            fontFamily: 'Arial', fontSize: 32, color: '#ffff00',
            stroke: '#000000', strokeThickness: 5,
            align: 'center', backgroundColor: 'rgba(0,0,0,0.5)'
        }).setOrigin(0.5).setInteractive();

        this.retryButton.on('pointerdown', () => {
            this.scene.start('Game', { level: this.level });
        });

        // Main Menu Button
        this.mainMenuButton = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY + 120, 'Main Menu', {
            fontFamily: 'Arial', fontSize: 32, color: '#00ff00',
            stroke: '#000000', strokeThickness: 5,
            align: 'center', backgroundColor: 'rgba(0,0,0,0.5)'
        }).setOrigin(0.5).setInteractive();

        this.mainMenuButton.on('pointerdown', () => {
            this.scene.start('MainMenu');
        });

        // Remove old input listener if any
        // this.input.once('pointerdown', () => {
        //     this.scene.start('MainMenu');
        // });
    }
}
