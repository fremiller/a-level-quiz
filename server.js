var {Database} = require("./src/database");
var httpServer = require("./src/httpserver");
var {GameManager} = require("./src/game");

async function init(){
    console.log("A Level Quiz server");
    console.log("By Freddie Miller");
    console.log("Version 0.0.1");
    console.log("Setting up database");
    Database.singleton = new Database(function(){
        // Database is now ready
        // Start express server
        console.log("Starting HTTP server");
        httpServer.start(function(){
            GameManager.singleton = new GameManager();
            console.log("Ready");
        }) 
    });
}

init();