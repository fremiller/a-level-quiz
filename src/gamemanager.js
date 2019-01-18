/**
 * Contains GameManager class
 * @module src/gamemanager
 */


let auth = require("./auth")
let { Module } = require("./module");
let { Game } = require("./game");

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
        /**
         * The reference to the only instance of the class
         * @type {GameManager}
         * @static
         */
        GameManager.singleton = this;
        var { HTTPServer } = require("./httpserver");
        this.log("Initializing IO object");
        this.games = {};
        this.io = HTTPServer.singleton.io;
        this.io.on("connection", this.onConnection);
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
        let game = gm.getGameByCode(code, "default");
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
                if(!user.toJSON){
                    user.toJSON = () => user;
                }
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
