let games = exports.games = {};
let server = require("./httpserver");
let auth = require("./auth")
let io = undefined;
let database = require("./database")

exports.start = function () {
    console.log("Initializing IO object")
    io = server.io;
    io.on("connection", onConnection)
}

async function onConnection(socket) {
    let code = socket.request._query.code;
    let token = socket.request._query.token;
    if (!code || !token) {
        console.error("Invalid parameters")
        socket.emit("displayError", { "text": "Invalid Parameters" });
        return;
    }
    let user = await auth.GetUserFromToken(token);
    let game = getGameByCode(code);
    if (!game) {
        console.error("Invalid game code");
        socket.emit("displayError", { "text": "Invalid game code" });
        return;
    }
    socket.join(code);
    
    if(game.players.length == 0){
        // We are the first player (the owner of the game)
        socket.on("startgame", function(){
            console.log("Starting game")
            game.startGame();
        })
    }
    
        game.join(user.toJSON());
    game.broadcastLobbyStatus();
    
}

class Game {
    constructor(creator) {
        this.code = generateGameCode();
        this.players = [];
        this.topics = [];
    }

    startGame(){
        this.sendQuestion();
    }

    toJSON() {
        return {
            "code": this.code,
            "players": this.players
        }
    }

    join(playerid){
        this.players.push(playerid)
    }

    broadcastLobbyStatus(){
        this.broadcast("updateLobbyStatus", {game: this.toJSON()});
    }

    async sendQuestion() {
        this.broadcast("showQuestion", await database.GetRandomQuestion())
    }

    broadcast(name, data) {
        io.in(this.code).emit(name, data);
    }
}

var generateGameCode = exports.generateGameCode = function () {
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += "1234567890"[Math.floor(Math.random() * 10)];
    }
    return code;
}

function getGameByCode(code) {
    return games[code];
}

var createGame = exports.createGame = function (userid) {
    let game = new Game(userid);
    games[game.code] = game;
    return game.toJSON();
}