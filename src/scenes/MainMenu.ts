import { Scene, GameObjects } from 'phaser';

export class MainMenu extends Scene {
    background: GameObjects.Image;
    logo: GameObjects.Image;
    title: GameObjects.Text;
    level1Button: GameObjects.Text;

    constructor() {
        super('MainMenu');
    }

    create(data: { level?: number }) // Accept data, though not used directly here for now
    {
        this.background = this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, 'background');
        // Scale background to fit screen if necessary - or ensure it's large enough
        // this.background.setDisplaySize(this.cameras.main.width, this.cameras.main.height);

        this.logo = this.add.image(this.cameras.main.centerX, this.cameras.main.centerY - 100, 'logo').setOrigin(0.5);

        this.title = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY + 50, 'Main Menu', {
            fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        this.level1Button = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY + 150, 'Level 1', {
            fontFamily: 'Arial Black', fontSize: 32, color: '#ffff00',
            stroke: '#000000', strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5).setInteractive();

        this.level1Button.on('pointerdown', () => {
            this.scene.start('Game', { level: 1 }); // Pass level data to Game scene
        });

        // If coming from GameOver with a specific level to restart
        if (data && data.level) {
            // Potentially highlight the level button or add other logic
        }
    }
}
