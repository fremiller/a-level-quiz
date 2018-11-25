var { Database } = require("./src/database");
var { HTTPServer } = require("./src/httpserver");
var { GameManager } = require("./src/gamemanager");

/**
 * Starts the server
 */
function init() {
    console.log("A Level Quiz server");
    console.log("By Freddie Miller");
    console.log("Version 0.0.1");
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