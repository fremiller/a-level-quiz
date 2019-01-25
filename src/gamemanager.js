"use strict";
/**
 * Contains GameManager class
 * @module src/gamemanager
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const httpserver_1 = require("./httpserver");
const auth = require("./auth");
const module_1 = require("./module");
const game_1 = require("./game");
/**
 * Class which manages all games
 * @extends Module
 */
class GameManager extends module_1.Module {
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
        this.log("Initializing IO object");
        this.games = {};
        this.io = httpserver_1.HTTPServer.singleton.io;
        this.io.on("connection", this.onConnection);
    }
    /**
     * Runs when a new socket connects.
     * Sets up all socket.io events for the user
     * @param {Socket} socket
     */
    onConnection(socket) {
        return __awaiter(this, void 0, void 0, function* () {
            const gm = GameManager.singleton;
            gm.log("[GAME] New socket connection");
            let code = socket.request._query.code;
            let token = socket.request._query.token;
            let createGame = socket.request._query.createGame;
            if ((!code || !token) && !createGame) {
                gm.log("[ERROR][GAME] Invalid Join Parameters");
                socket.emit("displayError", {
                    "text": "Invalid Parameters"
                });
                return;
            }
            gm.log("[INFO][GAME] Getting user");
            let user = yield auth.getUserFromToken(token);
            gm.log("[INFO][GAME] Getting game");
            if (createGame) {
                gm.createGame(code, user, socket);
            }
            else {
                let game = gm.getGameByCode(code);
                if (!game) {
                    gm.log("[ERROR][GAME] Invalid Game Code");
                    socket.emit("displayError", {
                        "text": "Invalid game code"
                    });
                    return;
                }
                console.log(`${user.name} is joining ${code}`);
                game.joinGame(user, socket);
            }
        });
    }
    /**
   * Checks if there is game based on the domain and class ID
   * @param {string} domain domain the class is in
   * @param {string} classid The classID of the class
   */
    isGame(classid) {
        let g = this.games[classid];
        return g ? g.code : undefined;
    }
    /**
     * Returns a game with the specified ID and code
     * @param {string} code The classID of the game
     * @param {string} domain The domain of the class
     */
    getGameByCode(code) {
        return this.games[code];
    }
    /**
     * Creates a game based on the specified domain and class
     * @param {string} classid The ClassID of the class
     * @param {string} domain The Domain of the class
     */
    createGame(classid, host, hostSocket) {
        let game = new game_1.Game(classid, {}, host, hostSocket);
        this.games[classid] = game;
        return game;
    }
    deleteGame(classid) {
        this.games[classid] = undefined;
    }
}
exports.GameManager = GameManager;
//# sourceMappingURL=gamemanager.js.map