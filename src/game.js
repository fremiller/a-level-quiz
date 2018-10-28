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
    console.log("[GAME] New socket connection")
    let code = socket.request._query.code;
    let token = socket.request._query.token;
    if (!code || !token) {
        console.log("[ERROR][GAME] Invalid Join Parameters")
        socket.emit("displayError", { "text": "Invalid Parameters" });
        return;
    }
    console.log("[INFO][GAME] Getting user")
    let user = await auth.GetUserFromToken(token);
    console.log("[INFO][GAME] Getting game")
    let game = getGameByCode(code);
    if (!game) {
        console.log("[ERROR][GAME] Invalid Game Code")
        socket.emit("displayError", { "text": "Invalid game code" });
        return;
    }
    console.log("[INFO][GAME] Joining game by code")
    socket.join(code);

    if (game.players.length == 0) {
        console.log("[INFO][GAME] First Game User")
        // We are the first player (the owner of the game)
        socket.on("startgame", function () {
            console.log("[INFO][GAME] Starting game "+game.code)
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
        console.log("[INFO][GAME] New game "+ this.code)
    }

    startGame() {
        this.sendQuestion();
    }

    toJSON() {
        return {
            "code": this.code,
            "players": this.players
        }
    }

    join(playerid) {
        console.log(`[INFO][GAME][${this.code}] New player joined`)
        this.players.push(playerid)
    }

    broadcastLobbyStatus() {
        console.log(`[INFO][GAME][${this.code}] Updating lobby status`)
        this.broadcast("updateLobbyStatus", { game: this.toJSON() });
    }

    async sendQuestion() {
        console.log(`[INFO][GAME][${this.code}] Sending question`)
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