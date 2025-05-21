import HHModel from './hh-model.js';

class Simulator {
    constructor() {
        this.model = new HHModel();
        this.running = false;
        this.animationFrameId = null;
        this.dataBuffer = {
            time: [],
            voltage: [],
            iNa: [],
            iK: [],
            iL: [],
            gating: {
                m: [],
                h: [],
                n: []
            }
        };
        this.bufferSize = 2000;
        this.onUpdate = null;
        this.stim1 = {
            amplitude: 10,   // μA/cm²
            duration: 1,     // ms
            active: false,
            startTime: 0     // ms
        };
        this.stim2 = {
            amplitude: -10,  // μA/cm²
            duration: 1,     // ms
            active: false,
            startTime: 0     // ms
        };
        
        // Store initial state
        this.storeData(this.model.time, {
            V: this.model.V,
            m: this.model.m,
            h: this.model.h,
            n: this.model.n,
            iNa: 0,
            iK: 0,
            iL: 0
        });
    }

    // Stop the simulation
    stop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.running = false;
        this.stim1.active = false;
        this.stim2.active = false;
    }

    // Calculate total stimulus current at a given time
    calculateStimulusCurrent(t) {
        let iStim = 0;
        
        if (this.stim1.active && 
            t >= this.stim1.startTime && 
            t < this.stim1.startTime + this.stim1.duration) {
            iStim += this.stim1.amplitude;
        }
        
        if (this.stim2.active && 
            t >= this.stim2.startTime && 
            t < this.stim2.startTime + this.stim2.duration) {
            iStim += this.stim2.amplitude;
        }
        
        return iStim / 1000; // Convert μA/cm² to mA/cm²
    }

    // Store simulation data
    storeData(time, data) {
        // Only store data every few steps to avoid overwhelming the chart
        if (this.dataBuffer.time.length === 0 || 
            time - this.dataBuffer.time[this.dataBuffer.time.length - 1] >= 0.05) {
            
            this.dataBuffer.time.push(time);
            this.dataBuffer.voltage.push(data.V);
            this.dataBuffer.iNa.push(data.iNa);
            this.dataBuffer.iK.push(data.iK);
            this.dataBuffer.iL.push(data.iL);
            this.dataBuffer.gating.m.push(data.m);
            this.dataBuffer.gating.h.push(data.h);
            this.dataBuffer.gating.n.push(data.n);
            
            // Keep data arrays at reasonable size
            if (this.dataBuffer.time.length > this.bufferSize) {
                this.dataBuffer.time.shift();
                this.dataBuffer.voltage.shift();
                this.dataBuffer.iNa.shift();
                this.dataBuffer.iK.shift();
                this.dataBuffer.iL.shift();
                this.dataBuffer.gating.m.shift();
                this.dataBuffer.gating.h.shift();
                this.dataBuffer.gating.n.shift();
            }
        }
    }

    // Run simulation for a specified duration
    runFor(duration) {
        if (this.running) return;
        this.running = true;
        
        const endTime = this.model.time + duration;
        let lastUpdateTime = performance.now();
        const targetFrameTime = 1000 / 60; // Target 60 FPS
        let accumulatedTime = 0;
        const maxTimeStep = 0.1; // Maximum time step in ms
        
        const simulate = (currentTime) => {
            if (!this.running) return;

            const deltaTime = Math.min(currentTime - lastUpdateTime, 50); // Cap at 50ms to prevent huge jumps
            accumulatedTime += deltaTime;
            
            // Only update if enough time has passed
            while (accumulatedTime >= targetFrameTime) {
                // Run multiple steps per frame for efficiency
                const numSteps = Math.min(10, Math.floor(targetFrameTime / maxTimeStep));
                const dt = targetFrameTime / numSteps;
                
                for (let i = 0; i < numSteps; i++) {
                    const iStim = this.calculateStimulusCurrent(this.model.time);
                    const data = this.model.step(iStim);
                    this.storeData(this.model.time, data);
                    
                    if (this.model.time >= endTime) {
                        this.stop();
                        if (this.onUpdate) this.onUpdate(this.dataBuffer);
                        return;
                    }
                }
                
                accumulatedTime -= targetFrameTime;
                if (this.onUpdate) this.onUpdate(this.dataBuffer);
            }
            
            lastUpdateTime = currentTime;
            
            if (this.model.time < endTime) {
                this.animationFrameId = requestAnimationFrame(simulate);
            } else {
                this.stop();
            }
        };
        
        this.animationFrameId = requestAnimationFrame(simulate);
    }

    // Apply stimulus 1
    applyStim1() {
        if (!this.running) {
            this.stim1.active = true;
            this.stim1.startTime = this.model.time;
            this.runFor(50); // Run for 50ms after stimulus
        }
    }

    // Apply stimulus 2
    applyStim2() {
        if (!this.running) {
            this.stim2.active = true;
            this.stim2.startTime = this.model.time;
            this.runFor(50); // Run for 50ms after stimulus
        }
    }

    // Reset simulation
    reset() {
        this.stop();
        this.model.reset();
        
        // Clear data buffers
        this.dataBuffer.time = [];
        this.dataBuffer.voltage = [];
        this.dataBuffer.iNa = [];
        this.dataBuffer.iK = [];
        this.dataBuffer.iL = [];
        this.dataBuffer.gating.m = [];
        this.dataBuffer.gating.h = [];
        this.dataBuffer.gating.n = [];
        
        // Store initial state
        this.storeData(this.model.time, {
            V: this.model.V,
            m: this.model.m,
            h: this.model.h,
            n: this.model.n,
            iNa: 0,
            iK: 0,
            iL: 0
        });
        
        if (this.onUpdate) this.onUpdate(this.dataBuffer);
    }

    // Clear history but keep current state
    clearHistory() {
        const currentTime = this.model.time;
        const currentV = this.model.V;
        
        // Clear data buffers but keep current state
        this.dataBuffer.time = [currentTime];
        this.dataBuffer.voltage = [currentV];
        this.dataBuffer.iNa = [0];
        this.dataBuffer.iK = [0];
        this.dataBuffer.iL = [0];
        this.dataBuffer.gating.m = [this.model.m];
        this.dataBuffer.gating.h = [this.model.h];
        this.dataBuffer.gating.n = [this.model.n];
        
        if (this.onUpdate) this.onUpdate(this.dataBuffer);
    }

    // Update model parameters
    updateParameters(params) {
        this.model.updateParameters(params);
        if (params.stim1) Object.assign(this.stim1, params.stim1);
        if (params.stim2) Object.assign(this.stim2, params.stim2);
    }
}

export default Simulator; 