let games = exports.games = {};
let server = require("./httpserver");
let auth = require("./auth")
let io = undefined;
let database = require("./database")
let currentQuestion = undefined;

/**
 * Starts the Socket.io server
 */
exports.start = function () {
    console.log("Initializing IO object");
    io = server.io;
    io.on("connection", onConnection);
}

/**
 * Runs when a new socket connects.
 * Sets up all socket.io events for the user
 * @param {Socket} socket 
 */
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
            socket.on("revealAnswersToPlayers", function(){
                game.revealAnswersToPlayers();
            })
            socket.on("lobbyContinue", function () {
                game.sendQuestion();
            })
            socket.on("continueQuestion", function(){
                game.showScoreboard(game);
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

/**
 * Represents a class's game
 */
let Game = exports.Game = class Game {
    /**
     * @constructor Game
     * Initialises the game object
     * @param {string} classid The GC ID of the class
     * @param {string} domain The GSuite domain of the class
     */
    constructor(classid, domain) {
        this.code = classid;
        this.players = [];
        this.host = undefined;
        this.topics = [];
        this.domain = domain;
        this.pastQuestions = [];
        this.currentQuestion = undefined;
        this.questionTimeout = undefined;
        this.state = "LOBBY";
        this.scoresToAdd = {};
        this.showTimeout = undefined;
        console.log("[INFO][GAME] New game " + this.code)
    }

    /**
     * Sets the host of the game
     * @param {User} host The host of the game (teacher)
     * @param {Socket} socket The host's socket
     */
    setHost(host, socket) {
        host.socket = socket;
        this.host = host;
    }

    /**
     * Starts the game
     */
    startGame() {
        this.players.forEach((player) => {
            player.score = 0;
        });
        this.state = "GAME";
        this.sendQuestion();
    }

    /**
     * Gets the answer submitted by the given user
     * @param {string} user The UserID of the user
     */
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

    /**
     * Submits the answer from the user
     * @param {string} user The ID of the user
     * @param {number} answer The index of the answer
     * @param {Socket} socket The player's socket
     */
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

    /**
     * Gets the player object
     * @param {string} id The ID of the player
     * @returns {player} The player that has that ID
     */
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
        if(this.state == "SCOREBOARD"){
            return;
        }
        this.state = "SCOREBOARD";
        if (game.questionTimeout) {
            clearTimeout(game.questionTimeout);
        }
        console.log("revealAnswer")
        game.scoresToAdd = {};
        let answerStats = [{count: 0}, {count: 0}, {count: 0}, {count: 0}];
        answerStats[game.currentQuestion.correctAnswer].correct = true;
        game.currentQuestion.userAnswers.forEach(function (player, i) {
            answerStats[player.answer].count += 1;
            if (player.answer == game.currentQuestion.correctAnswer) {
                game.scoresToAdd[player.userid] = game.players.length - i + 5;
            }
        })
        this.players.forEach((player) => {
            if (this.scoresToAdd[player.googleid]) {
                player.score += this.scoresToAdd[player.googleid];
            }
        })
        game.sendToHost("revealAnswer", answerStats)
        this.showTimeout = setTimeout(() => game.sendToHost("scoreboard", game.currentQuestion), 10000)
    }

    revealAnswersToPlayers(){
        this.players.forEach((player) => {
            if (this.scoresToAdd[player.googleid]) {
                player.socket.emit("correctAnswer", player.score)
            } else {
                player.socket.emit("incorrectAnswer", player.score)
            }
        })
        this.sortScoreboard()
        this.currentQuestion.leaderboard = this.playerJSON()
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
        // if(this.players[indx].googleid == this.host.googleid){
        //     // This player is the teacher
        //     // end the game
        //     this.end("Teacher left.")
        // }
        if (indx != -1) {
            this.players.splice(indx);
        }
    }

    end(message){
        this.broadcast("displayError", {
            "text": message,
            "continue": "studentdashboard"
        })
        this.broadcast("forceDisconnect");
        games[this.domain][this.code] = undefined;
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
        if(this.showTimeout){
            clearTimeout(this.showTimeout);
            this.showTimeout = undefined;
        }
        if (this.currentQuestion) {
            this.pastQuestions.push(this.currentQuestion)
        }
        console.log(`[INFO][GAME][${this.code}] Sending question`)
        this.currentQuestion = await database.GetRandomQuestion();
        this.currentQuestion.userAnswers = [];
        this.currentQuestion.number = this.pastQuestions.length + 1;
        this.broadcast("showQuestion", this.currentQuestion)
        this.state = "QUESTION";
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
    if (!games["none"]) {
        return undefined;
    }
    let g = games["none"][classid];
    return g ? g.code : undefined;
}

exports.getGameByCode = getGameByCode = function (code, domain) {
    if (!games["none"]) {
        return undefined;
    }
    return games["none"][code];
}

var createGame = exports.createGame = function (classid, domain) {
    let game = new Game(classid, "none");
    //games[game.code] = game;
    if (!games["none"]) {
        games["none"] = {};
    }
    games["none"][classid] = game;
    return game.toJSON();
}