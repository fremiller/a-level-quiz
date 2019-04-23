import {Database} from "./src/database";
import {HTTPServer} from "./src/httpserver";
import {GameManager} from "./src/gamemanager";
import {Admin} from "./src/admin";

/**
 * Starts the server
 */
function init() {
    // Instantiate the admin module
    new Admin();
    console.log("Quizi server");
    console.log("Version 0.9.4");
    console.log("Connecting to database");
    // Instantiate the database
    new Database(function () {
        // Database is now ready
        // Start express server
        console.log("Starting HTTP server");
        new HTTPServer();
        HTTPServer.singleton.setup();
        // Start the Game Manager
        new GameManager();
        console.log("Ready");
    });
}

init();