/**
 * Main function of the program, creates an instance of Renderer, initializes its inputs and calls render method
 * Surrounded with try catch for warnings about initializing errors (eg. browser does not support WebGL, etc.)
 */

import Renderer from "./renderer.js";
import '../css/styles.css';
import('bootstrap/dist/css/bootstrap.min.css');
import('bootstrap');


try {
    const renderer = new Renderer();
    renderer.initInputs()
        .render();
} catch (exception) {
    console.warn(exception);
}