"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("./src/database");
const httpserver_1 = require("./src/httpserver");
const gamemanager_1 = require("./src/gamemanager");
const admin_1 = require("./src/admin");
/**
 * Starts the server
 */
function init() {
    new admin_1.Admin();
    console.log("A Level Quiz server");
    console.log("By Freddie Miller");
    console.log("Version 0.1.3");
    console.log("Setting up database");
    new database_1.Database(function () {
        // Database is now ready
        // Start express server
        console.log("Starting HTTP server");
        new httpserver_1.HTTPServer();
        httpserver_1.HTTPServer.singleton.setup();
        new gamemanager_1.GameManager();
        console.log("Ready");
    });
}
init();
//# sourceMappingURL=server.js.map