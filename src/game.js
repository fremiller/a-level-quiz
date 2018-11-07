let games = exports.games = {};
let server = require("./httpserver");
let auth = require("./auth")
let io = undefined;
let database = require("./database")

exports.start = function () {
    console.log("Initializing IO object")
    io = server.io;
    io.on("connection", onConnection);
}

async function onConnection(socket) {
    console.log("[GAME] New socket connection")
    let code = socket.request._query.code;
    let token = socket.request._query.token;
    if (!code || !token) {
        console.log("[ERROR][GAME] Invalid Join Parameters")
        socket.emit("displayError", {
            "text": "Invalid Parameters"
        });
        return;
    }
    console.log("[INFO][GAME] Getting user")
    let user = await auth.GetUserFromToken(token);
    console.log("[INFO][GAME] Getting game")
    let game = getGameByCode(code);
    if (!game) {
        console.log("[ERROR][GAME] Invalid Game Code")
        socket.emit("displayError", {
            "text": "Invalid game code"
        });
        return;
    }
    if (game.state == "LOBBY") {
        console.log("[INFO][GAME] Joining game by code")
        socket.join(code);
        if (game.players.length == 0) {
            console.log("[INFO][GAME] First Game User")
            // We are the first player (the owner of the game)
            socket.on("startgame", function () {
                console.log("[INFO][GAME] Starting game " + game.code)
                game.startGame();
            })
            socket.on("lobbyContinue", function () {
                game.sendQuestion();
            })
            game.setHost(user.toJSON(), socket)
        } else {
            socket.on("submitAnswer", function (id) {
                game.submitAnswer(user.googleid, id)
                socket.emit("hideAnswers")
            })
        }
        game.join(user.toJSON(), socket);
        game.broadcastLobbyStatus();
    }
    else{
        socket.emit("displayError", {
            "text": "Game already started"
        });
    }
}

let Game = exports.Game = class Game {
    constructor(creator) {
        this.code = generateGameCode();
        this.players = [];
        this.host = undefined;
        this.topics = [];
        this.pastQuestions = [];
        this.currentQuestion = undefined;
        this.state = "LOBBY";
        console.log("[INFO][GAME] New game " + this.code)
    }

    setHost(host, socket) {
        host.socket = socket;
        this.host = host;
    }

    startGame() {
        this.players.forEach((player) => {
            player.score = 0;
        });
        this.state = "GAME";
        this.sendQuestion();
    }

    getCurrentAnswerByUser(user) {
        if (typeof (user) != "string") {
            return undefined;
        }
        for (let i = 0; i < this.currentQuestion.userAnswers.length; i++) {
            if (this.currentQuestion.userAnswers[i].userid == user) {
                return this.currentQuestion.userAnswers[i];
            }
        }
        return undefined;
    }

    submitAnswer(user, answer) {
        if (this.getCurrentAnswerByUser(user)) {
            console.log(`[GAME][${this.code}] Player ${user} has already submitted answer`)
            return;
        }
        console.log(`[GAME][${this.code}] Player ${user} submitted answer ${answer}`)
        this.currentQuestion.userAnswers.push({
            "userid": user,
            "answer": answer,
            "time": 0
        });
        if (this.currentQuestion.userAnswers.length >= this.players.length - 1) {
            this.showScoreboard()
        }
    }

    sortScoreboard() {
        this.players.sort((a, b) => {
            return b.score - a.score;
        })
    }

    getPlayerByGoogleId(id) {
        let p = undefined;
        this.players.forEach((pl) => {
            if (pl.googleid == id) {
                p = pl;
            }
        })
        return p
    }

    showScoreboard() {
        console.log("revealAnswer")
        let scoresToAdd = {};
        let game = this;
        this.currentQuestion.userAnswers.forEach(function (player, i) {
            if (player.answer == game.currentQuestion.correctAnswer) {
                scoresToAdd[player.userid] = game.players.length - i + 5;
            }
        })
        this.players.forEach((player) => {
            if (scoresToAdd[player.googleid]) {
                player.score += scoresToAdd[player.googleid];
                player.socket.emit("correctAnswer", player.score)
            } else {
                console.log("incorrect")
                player.socket.emit("incorrectAnswer", player.score)
            }
        })
        this.sortScoreboard()
        this.currentQuestion.leaderboard = this.playerJSON()
        game = this;
        this.sendToHost("revealAnswer", this.currentQuestion)
        setTimeout(() => this.sendToHost("scoreboard", game.currentQuestion), 5000)
    }

    playerJSON() {
        let j = [];
        this.players.forEach((player) => {
            j.push({
                googleid: player.googleid,
                name: player.name,
                score: player.score
            })
        })
        return j
    }

    toJSON() {
        return {
            "code": this.code,
            "players": this.playerJSON()
        }
    }

    join(player, socket) {
        console.log(`[INFO][GAME][${this.code}] New player joined`)
        player.socket = socket;
        this.players.push(player);
    }

    broadcastLobbyStatus() {
        console.log(`[INFO][GAME][${this.code}] Updating lobby status`)
        this.broadcast("updateLobbyStatus", {
            game: this.toJSON()
        });
    }

    async sendQuestion() {
        if (this.currentQuestion) {
            this.pastQuestions.push(this.currentQuestion)
        }
        console.log(`[INFO][GAME][${this.code}] Sending question`)
        this.currentQuestion = await database.GetRandomQuestion();
        this.currentQuestion.userAnswers = [];
        this.broadcast("showQuestion", this.currentQuestion)
    }

    broadcast(name, data) {
        try {
            io.in(this.code).emit(name, data);
        } catch (e) {
            console.log(`[ERR][GAME][${this.code}][broadcast]Broadcast failed ${e}`)
        }
    }

    sendToHost(name, data) {
        this.host.socket.emit(name, data);
    }
}

var generateGameCode = exports.generateGameCode = function () {
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += "1234567890" [Math.floor(Math.random() * 10)];
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