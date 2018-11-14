let games = exports.games = {};
let server = require("./httpserver");
let auth = require("./auth")
let io = undefined;
let database = require("./database")
let currentQuestion = undefined;

exports.start = function () {
    console.log("Initializing IO object");
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
    let game = getGameByCode(code, user.domain);
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
                game.submitAnswer(user.googleid, id, socket)
                socket.emit("hideAnswers")
            })
        }
        socket.on("disconnect", function () {
            game.leave(socket);
            game.broadcastLobbyStatus();
        })
        game.join(user.toJSON(), socket);
        game.broadcastLobbyStatus();
    } else {
        socket.emit("displayError", {
            "text": "Game already started"
        });
    }
}

let Game = exports.Game = class Game {
    constructor(classid) {
        this.code = classid;
        this.players = [];
        this.host = undefined;
        this.topics = [];
        this.pastQuestions = [];
        this.currentQuestion = undefined;
        this.questionTimeout = undefined;
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

    submitAnswer(user, answer, socket) {
        if (this.getCurrentAnswerByUser(user)) {
            console.log(`[GAME][${this.code}] Player ${user} has already submitted answer`)
            return;
        }
        let p = this.getPlayerByGoogleId(user)
        if (!p) {
            return;
        }
        if (p.socket.id != socket.id) {
            return;
        }
        console.log(`[GAME][${this.code}] Player ${user} submitted answer ${answer}`)
        this.currentQuestion.userAnswers.push({
            "userid": user,
            "answer": answer,
            "time": 0
        });
        this.updateAnswersAmount();
        let game = this;
        if (this.currentQuestion.userAnswers.length >= this.players.length - 1) {
            setTimeout(() => game.showScoreboard(game), 200)
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

    showScoreboard(game) {
        if (game.questionTimeout) {
            clearTimeout(game.questionTimeout);
        }
        console.log("revealAnswer")
        let scoresToAdd = {};
        let answerStats = [{count: 0}, {count: 0}, {count: 0}, {count: 0}];
        answerStats[game.currentQuestion.correctAnswer].correct = true;
        game.currentQuestion.userAnswers.forEach(function (player, i) {
            answerStats[player.answer] += 1;
            if (player.answer == game.currentQuestion.correctAnswer) {
                scoresToAdd[player.userid] = game.players.length - i + 5;
            }
        })
        game.players.forEach((player) => {
            if (scoresToAdd[player.googleid]) {
                player.score += scoresToAdd[player.googleid];
                player.socket.emit("correctAnswer", player.score)
            } else {
                console.log("incorrect")
                player.socket.emit("incorrectAnswer", player.score)
            }
        })
        game.sortScoreboard()
        game.currentQuestion.leaderboard = game.playerJSON()
        game.sendToHost("revealAnswer", answerStats)
        setTimeout(() => game.sendToHost("scoreboard", game.currentQuestion), 10000)
    }

    playerJSON() {
        let j = [];
        this.players.forEach((player) => {
            j.push({
                googleid: player.googleid,
                name: player.name,
                score: player.score,
                type: player.userType
            })
        })
        return j
    }

    toJSON() {
        return {
            "code": this.code,
            "players": this.playerJSON(),
            "state": this.state
        }
    }

    updateAnswersAmount() {
        this.sendToHost("numberOfAnswers", this.currentQuestion.userAnswers.length)
    }

    join(player, socket) {
        console.log(`[INFO][GAME][${this.code}] New player joined`)
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].googleid == player.googleid) {
                this.players[i].socket.emit("displayError", {
                    "text": "Another device has signed in with this account."
                })
                this.players[i].socket.emit("forceDisconnect")
                this.players[i].socket.disconnect(true);
                console.log(`[GAME][${this.code}] Player connection overwritten`)
                // This socket will be destroyed
            }
        }
        player.socket = socket;
        this.players.push(player);
    }

    leave(socket) {
        let indx = -1;
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].socket.id == socket.id) {
                indx = i;
            }
        }
        if (indx != -1) {
            this.players.splice(indx);
        }
    }

    broadcastLobbyStatus() {
        if (this.state == "LOBBY") {
            console.log(`[INFO][GAME][${this.code}] Updating lobby status`)
            this.broadcast("updateLobbyStatus", {
                game: this.toJSON()
            });
        }
    }

    async sendQuestion() {
        if (this.currentQuestion) {
            this.pastQuestions.push(this.currentQuestion)
        }
        console.log(`[INFO][GAME][${this.code}] Sending question`)
        this.currentQuestion = await database.GetRandomQuestion();
        this.currentQuestion.userAnswers = [];
        this.currentQuestion.number = this.pastQuestions.length + 1;
        this.broadcast("showQuestion", this.currentQuestion)
        let game = this;
        this.questionTimeout = setTimeout(() => game.showScoreboard(game), this.currentQuestion.timeLimit * 1000)
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

exports.isGame = isGame = function (domain, classid) {
    if (!games[domain ? domain : "none"]) {
        return undefined;
    }
    let g = games[domain ? domain : "none"][classid];
    return g ? g.code : undefined;
}

exports.getGameByCode = getGameByCode = function (code, domain) {
    if (!games[domain ? domain : "none"]) {
        return undefined;
    }
    return games[domain ? domain : "none"][code];
}

var createGame = exports.createGame = function (classid, domain) {
    let game = new Game(classid);
    //games[game.code] = game;
    if (!games[domain ? domain : "none"]) {
        games[domain ? domain : "none"] = {};
    }
    games[domain ? domain : "none"][classid] = game;
    return game.toJSON();
}