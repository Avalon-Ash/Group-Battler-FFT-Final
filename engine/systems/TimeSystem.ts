
export class TimeSystem {
    public timeScale: number = 1.0;
    public targetTimeScale: number = 1.0;
    public battleTime: number = 0;

    public reset() {
        this.timeScale = 1.0;
        this.targetTimeScale = 1.0;
        this.battleTime = 0;
    }

    public update(dt: number) {
        // Smoothly interpolate time scale
        if (Math.abs(this.targetTimeScale - this.timeScale) > 0.01) {
            this.timeScale += (this.targetTimeScale - this.timeScale) * 5.0 * dt; 
        } else {
            this.timeScale = this.targetTimeScale;
        }
    }

    public tick(dt: number) {
        this.battleTime += dt;
    }
}
