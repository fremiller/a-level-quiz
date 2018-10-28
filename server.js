var database = require("./src/database");
var httpServer = require("./src/httpserver");
var game = require("./src/game")

function init(){
    console.log("A Level Quiz server");
    console.log("Setting up database");
    database.init(function(){
        // Database is now ready
        // Start express server
        console.log("Starting HTTP server")
        httpServer.start(function(){
            console.log("Starting Socket.IO");
            game.start();
        }) 
    });
}

init();