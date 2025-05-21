import UIController from './ui-controller.js';

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create and initialize the UI controller
    const controller = new UIController();
    controller.init();
    
    // Store controller instance for potential cleanup
    window.hhSimulator = {
        controller,
        destroy: () => {
            controller.destroy();
            delete window.hhSimulator;
        }
    };
}); 