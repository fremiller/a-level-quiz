import {Database} from "./src/database";
import {HTTPServer} from "./src/httpserver";
import {GameManager} from "./src/gamemanager";
import {Admin} from "./src/admin";

/**
 * Starts the server
 */
function init() {
    new Admin();
    console.log("A Level Quiz server");
    console.log("By Freddie Miller");   
    console.log("Version 0.1.3");
    console.log("Setting up database");
    new Database(function () {
        // Database is now ready
        // Start express server
        console.log("Starting HTTP server");
        new HTTPServer();
        HTTPServer.singleton.setup();
        new GameManager();
        console.log("Ready");
    });
}

init();