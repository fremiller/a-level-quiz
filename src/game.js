/**
 * Game module
 * @module src/game
 */

let server = require("./httpserver");
let auth = require("./auth")
let { Module } = require("./module");
let io = undefined;
let {Database} = require("./database")
let currentQuestion = undefined;

/** 
 * Class which manages all games
 * @extends Module
 */
exports.GameManager = class GameManager extends Module {

    /**
     * @constructor
     * @description Adds the onConnection method to the server
     */
    constructor() {
        super("GameManager");
        this.log("Initializing IO object");
        this.games = {};
        io = server.io;
        io.on("connection", this.onConnection);
    }

    /**
     * Runs when a new socket connects.
     * Sets up all socket.io events for the user
     * @param {Socket} socket 
     */
    async onConnection(socket) {
        const gm = GameManager.singleton;
        gm.log("[GAME] New socket connection")
        let code = socket.request._query.code;
        let token = socket.request._query.token;
        if (!code || !token) {
            gm.log("[ERROR][GAME] Invalid Join Parameters")
            socket.emit("displayError", {
                "text": "Invalid Parameters"
            });
            return;
        }
        gm.log("[INFO][GAME] Getting user")
        let user = await auth.GetUserFromToken(token);
        gm.log("[INFO][GAME] Getting game")
        let game = gm.getGameByCode(code, user.domain);
        if (!game) {
            gm.log("[ERROR][GAME] Invalid Game Code")
            socket.emit("displayError", {
                "text": "Invalid game code"
            });
            return;
        }
        if (game.state == "LOBBY") {
            gm.log("[INFO][GAME] Joining game by code")
            socket.join(code);
            if (game.players.length == 0) {
                gm.log("[INFO][GAME] First Game User")
                // We are the first player (the owner of the game)
                socket.on("startgame", function () {
                    gm.log("[INFO][GAME] Starting game " + game.code)
                    game.startGame();
                })
                socket.on("revealAnswersToPlayers", function () {
                    game.revealAnswersToPlayers();
                })
                socket.on("lobbyContinue", function () {
                    game.sendQuestion();
                })
                socket.on("continueQuestion", function () {
                    game.showScoreboard(game);
                })
                socket.on("finishGame", function () {
                    game.finishGame(game);
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
     * Checks if there is game based on the domain and class ID  
     * @param {string} domain domain the class is in
     * @param {string} classid The classID of the class
     */
    isGame(domain, classid) {
        if (!this.games["none"]) {
            return undefined;
        }
        let g = this.games["none"][classid];
        return g ? g.code : undefined;
    }

    /**
     * Returns a game with the specified ID and code
     * @param {string} code The classID of the game
     * @param {string} domain The domain of the class
     */
    getGameByCode(code, domain) {
        if (!this.games["none"]) {
            return undefined;
        }
        return this.games["none"][code];
    }

    /**
     * Creates a game based on the specified domain and class
     * @param {string} classid The ClassID of the class
     * @param {string} domain The Domain of the class
     */
    createGame(classid, domain) {
        let game = new Game(classid, "none");
        //games[game.code] = game;
        if (!this.games["none"]) {
            this.games["none"] = {};
        }
        this.games["none"][classid] = game;
        return game.toJSON();
    }
}

/**
 * @typedef {Object} GamePlayer
 * @property {string} googleId The googleID of the player
 * @property {string} name The name of the player
 * @property {number} score The score of the player
 * @property {UserType} type The UserType of the player
 */

/**
 * Represents a class's game
 */
let Game = exports.Game = class Game {
    /**
     * @constructor
     * @description Initialises the game object
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
        this.showTimeout = undefined;
        this.log("[INFO][GAME] New game " + this.code)
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
            this.log(`[GAME][${this.code}] Player ${user} has already submitted answer`)
            return;
        }
        let p = this.getPlayerByGoogleId(user)
        if (!p) {
            return;
        }
        if (p.socket.id != socket.id) {
            return;
        }
        p.questions[this.pastQuestions.length] = answer;
        this.log(`[GAME][${this.code}] Player ${user} submitted answer ${answer}`)
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

    /**
     * Sorts the scoreboard based on the players' scores
     */
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

    /**
     * Sorts and shows the scoreboard on the clients
     * @param {Game} game The game object to display the scoreboard on
     */
    showScoreboard(game) {
        if (this.state == "SCOREBOARD") {
            return;
        }
        this.state = "SCOREBOARD";
        if (game.questionTimeout) {
            clearTimeout(game.questionTimeout);
        }
        game.currentQuestion.scoresToAdd = {};
        let answerStats = [{ count: 0 }, { count: 0 }, { count: 0 }, { count: 0 }];
        answerStats[game.currentQuestion.correctAnswer].correct = true;
        game.currentQuestion.userAnswers.forEach(function (player, i) {
            answerStats[player.answer].count += 1;
            if (player.answer == game.currentQuestion.correctAnswer) {
                game.currentQuestion.scoresToAdd[player.userid] = game.players.length - i + 5;
            }
        })
        this.players.forEach((player) => {
            if (game.currentQuestion.scoresToAdd[player.googleid]) {
                player.score += game.currentQuestion.scoresToAdd[player.googleid];
            }
        })
        game.sendToHost("revealAnswer", answerStats)
        this.showTimeout = setTimeout(() => game.sendToHost("scoreboard", game.currentQuestion), 10000)
    }

    /**
     * Shows the answers to all player clients. Called by the teacher client
     */
    revealAnswersToPlayers() {
        this.players.forEach((player) => {
            if (this.currentQuestion.scoresToAdd[player.googleid]) {
                player.socket.emit("correctAnswer", player.score)
            } else {
                player.socket.emit("incorrectAnswer", player.score)
            }
        })
        this.sortScoreboard()
        this.currentQuestion.leaderboard = this.playerJSON()
    }

    /**
     * Turns the player object to JSON
     * @returns {GamePlayer[]} playerList
     * 
     */
    playerJSON() {
        let j = [];
        this.players.forEach((player) => {
            j.push({
                googleid: player.googleid,
                name: player.name,
                score: player.score,
                type: player.userType,
                questions: player.questions
            })
        })
        return j
    }

    async finishGame(g) {
        this.log(`[INFO][GAME][${this.code}] Game finished`);
        let time = new Date().getTime();
        if (this.currentQuestion) {
            this.pastQuestions.push(this.currentQuestion);
        }
        this.log(`[INFO][GAME][${this.code}][UPLOAD] Uploading game info...`);
        let gameId = this.code + "T" + time;
        this.log(`[INFO][GAME][${this.code}][UPLOAD] New game id ${gameId}`);
        this.log(gameId);
        this.currentQuestion = undefined;
        let playerids = [];
        await this.players.forEach(async (player, i) => {
            let userGameStats = {
                gameId: gameId,
                position: i,
                userId: player.googleid,
                questions: player.questions
            };
            this.log(`[INFO][GAME][${this.code}][UPLOAD] New UGS ${userGameStats}`);
            playerids.push(player.googleId)
            await Database.singleton.addUserGameStats(userGameStats);
            await Database.singleton.addGameToUser(player.googleid, gameId)
        });
        await Database.singleton.addGameStats({
            gameId: gameId,
            players: playerids
        });
        this.log(`[INFO][GAME][${this.code}][UPLOAD] Done!`);
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
        this.log(`[INFO][GAME][${this.code}] New player joined`)
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].googleid == player.googleid) {
                this.players[i].socket.emit("displayError", {
                    "text": "Another device has signed in with this account."
                })
                this.players[i].socket.emit("forceDisconnect")
                this.players[i].socket.disconnect(true);
                this.log(`[GAME][${this.code}] Player connection overwritten`)
                // This socket will be destroyed
            }
        }
        player.socket = socket;
        player.questions = [];
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

    end(message) {
        this.broadcast("displayError", {
            "text": message,
            "continue": "studentdashboard"
        })
        this.broadcast("forceDisconnect");
        this.games[this.domain][this.code] = undefined;
    }

    broadcastLobbyStatus() {
        if (this.state == "LOBBY") {
            this.log(`[INFO][GAME][${this.code}] Updating lobby status`)
            this.broadcast("updateLobbyStatus", {
                game: this.toJSON()
            });
        }
    }

    async sendQuestion() {
        if (this.showTimeout) {
            clearTimeout(this.showTimeout);
            this.showTimeout = undefined;
        }
        if (this.currentQuestion) {
            this.pastQuestions.push(this.currentQuestion)
        }
        this.players.forEach((p)=>{
            p.questions.push(-1);
        })
        this.log(`[INFO][GAME][${this.code}] Sending question`)
        this.currentQuestion = await Database.singleton.GetRandomQuestion();
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
            this.log(`[ERR][GAME][${this.code}][broadcast]Broadcast failed ${e}`)
        }
    }

    sendToHost(name, data) {
        this.host.socket.emit(name, data);
    }
}
