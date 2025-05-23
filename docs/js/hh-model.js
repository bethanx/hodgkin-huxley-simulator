import GateKinetics from './gate-kinetics.js';

// Hodgkin-Huxley Model Class
class HHModel {
    constructor() {
        // Membrane properties
        this.Cm = 1.0;  // µF/cm²
        this.V = -63.39;   // mV (initial membrane potential)
        
        // Channel conductances
        this.gNaMax = 120; // mS/cm²
        this.gKMax = 36;   // mS/cm²
        this.gL = 0.3;     // mS/cm²
        
        // Reversal potentials (calculated for T=6.3°C from MATLAB defaults, EL canonical)
        this.ENa = 52.36;     // mV (was 50)
        this.EK = -72.17;     // mV (was -77)
        this.EL = -54.4;   // mV (reverted to canonical -54.4, was -57.25)
        
        // Gate variables
        this.m = 0.068775;  // Na+ activation
        this.h = 0.515186;   // Na+ inactivation
        this.n = 0.35286656;  // K+ activation
        
        // Channel modifiers
        this.ttxBlock = 0;  // Na+ channel block (0-1)
        this.teaBlock = 0;  // K+ channel block (0-1)
        this.pronase = false; // Removes inactivation if true
        
        // Time step
        this.dt = 0.01;  // ms
        this.time = 0;   // ms

        // Initialize gates to steady state
        // this.updateSteadyStateGates(); // Match MATLAB: Do not force to steady state initially
    }

    // Reset the model to initial conditions
    reset() {
        this.V = -63.39; // Reset to MATLAB default V
        this.time = 0;
        this.m = 0.068775;  // Reset to MATLAB default m
        this.h = 0.515186;   // Reset to MATLAB default h
        this.n = 0.35286656;  // Reset to MATLAB default n
        this.updateSteadyStateGates(); // Ensure gates are steady state for the reset V
    }

    // Update gate variables to steady state values
    updateSteadyStateGates() {
        const v = this.V / 1000; // Convert to V for calculation
        this.m = GateKinetics.mInf(v);
        this.h = GateKinetics.hInf(v);
        this.n = GateKinetics.nInf(v);
    }

    // Step the model forward in time
    step(iStim) {
        // Current membrane potential (convert mV to V)
        const v = this.V / 1000;
        
        // Calculate rate constants
        const am = GateKinetics.alphaM(v);
        const bm = GateKinetics.betaM(v);
        const ah = GateKinetics.alphaH(v);
        const bh = GateKinetics.betaH(v);
        const an = GateKinetics.alphaN(v);
        const bn = GateKinetics.betaN(v);
        
        // Update gating variables
        this.m += this.dt * (am * (1 - this.m) - bm * this.m);
        if (!this.pronase) {
            this.h += this.dt * (ah * (1 - this.h) - bh * this.h);
        } else {
            this.h = 1; // Pronase removes inactivation
        }
        this.n += this.dt * (an * (1 - this.n) - bn * this.n);
        
        // Calculate ionic currents
        const { iNa, iK, iL } = this.calculateCurrents();
        const iTot = iNa + iK + iL;
        
        // Convert stimulus from μA/cm² to mA/cm² to match other currents
        const iStimMa = iStim / 1000;
        
        // Update membrane potential (convert back to mV)
        this.V += (this.dt * (iStimMa - iTot) / this.Cm) * 1000;
        
        // Update time
        this.time += this.dt;

        return {
            V: this.V,
            m: this.m,
            h: this.h,
            n: this.n,
            iNa: iNa * 1000, // Convert to μA/cm²
            iK: iK * 1000,   // Convert to μA/cm²
            iL: iL * 1000    // Convert to μA/cm²
        };
    }

    // Calculate ionic currents
    calculateCurrents() {
        // Calculate ionic conductances
        const gNa = this.gNaMax * Math.pow(this.m, 3) * (this.pronase ? 1 : this.h) * (1 - this.ttxBlock);
        const gK = this.gKMax * Math.pow(this.n, 4) * (1 - this.teaBlock);
        
        // Convert V and reversal potentials from mV to V for calculation
        const vVolts = this.V / 1000;
        const ENaVolts = this.ENa / 1000;
        const EKVolts = this.EK / 1000;
        const ELVolts = this.EL / 1000;
        
        // Calculate ionic currents (mA/cm²)
        const iNa = gNa * (vVolts - ENaVolts);
        const iK = gK * (vVolts - EKVolts);
        const iL = this.gL * (vVolts - ELVolts);
        
        return { iNa, iK, iL };
    }

    // Update model parameters
    updateParameters(params) {
        Object.assign(this, params);
        this.updateSteadyStateGates();
    }
}

// Export the model
export default HHModel; 
