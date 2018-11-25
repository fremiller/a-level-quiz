/**
 * Game module
 * @module src/game
 */


let io = undefined;
let {Database} = require("./database");
let {GameManager} = require("./gamemanager");
let currentQuestion = undefined;

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
exports.Game = class Game {
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
        console.log("[INFO][GAME] New game " + this.code);
        io = require("./gamemanager").GameManager.singleton.io;
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
        p.questions[this.pastQuestions.length] = answer;
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
        console.log(`[INFO][GAME][${this.code}] Game finished`);
        let time = new Date().getTime();
        if (this.currentQuestion) {
            this.pastQuestions.push(this.currentQuestion);
        }
        console.log(`[INFO][GAME][${this.code}][UPLOAD] Uploading game info...`);
        this.currentQuestion = undefined;
        let playerids = [];
        await this.players.forEach(async (player, i) => {
            let userGameStats = {
                classId: this.code,
                timestamp: time,
                position: i,
                userId: player.googleid,
                questions: player.questions
            };
            console.log(`[INFO][GAME][${this.code}][UPLOAD] New UGS ${userGameStats}`);
            playerids.push(player.googleId)
            await Database.singleton.addUserGameStats(userGameStats);
            await Database.singleton.addGameToUser(player.googleid, this.code, time)
        });
        await Database.singleton.addGameStats({
            timestamp: time,
            classId: this.code,
            players: playerids
        });
        console.log(`[INFO][GAME][${this.code}][UPLOAD] Done!`);
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
            console.log(`[INFO][GAME][${this.code}] Updating lobby status`)
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
        console.log(`[INFO][GAME][${this.code}] Sending question`)
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
            console.log(`[ERR][GAME][${this.code}][broadcast]Broadcast failed ${e}`)
        }
    }

    sendToHost(name, data) {
        this.host.socket.emit(name, data);
    }
}
