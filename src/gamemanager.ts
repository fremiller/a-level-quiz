/**
 * Contains GameManager class
 * @module src/gamemanager
 */

import { HTTPServer } from "./httpserver";
import * as auth from "./auth";
import { Module } from "./module";
import { Game } from "./game";
import { IUser } from "./models";

/** 
 * Class which manages all games
 * @extends Module
 */
export class GameManager extends Module {
    static singleton: GameManager;
    io: SocketIO.Server
    games: Map<String, Game>
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
        this.games = new Map<String, Game>();
        this.io = HTTPServer.singleton.io;
        this.io.on("connection", this.onConnection);
    }

    /**
     * Runs when a new socket connects.
     * Sets up all socket.io events for the user
     * @param {Socket} socket 
     */
    async onConnection(socket: SocketIO.Socket) {
        const gm = GameManager.singleton;
        gm.log("[GAME] New socket connection")
        let code = socket.request._query.code;
        let token = socket.request._query.token;
        let createGame = socket.request._query.createGame;

        if ((!code || !token) && !createGame) {
            gm.log("[ERROR][GAME] Invalid Join Parameters")
            socket.emit("displayError", {
                "text": "Invalid Parameters"
            });
            return;
        }
        gm.log("[INFO][GAME] Getting user")
        let user = await auth.getUserFromToken(token);
        gm.log("[INFO][GAME] Getting game")
        if (createGame) {
            gm.createGame(code, user, socket)
        }
        else {
            let game = gm.getGameByCode(code);
            if (!game) {
                gm.log("[ERROR][GAME] Invalid Game Code")
                socket.emit("displayError", {
                    "text": "Invalid game code"
                });
                return;
            }
            console.log(`${user.name} is joining ${code}`)
            game.joinGame(user, socket);
        }
    }
    /**
   * Checks if there is game based on the domain and class ID  
   * @param {string} domain domain the class is in
   * @param {string} classid The classID of the class
   */
    isGame(classid: string) {
        let g = this.games[classid];
        return g ? g.code : undefined;
    }

    /**
     * Returns a game with the specified ID and code
     * @param {string} code The classID of the game
     * @param {string} domain The domain of the class
     */
    getGameByCode(code: string): Game {
        return this.games[code];
    }

    /**
     * Creates a game based on the specified domain and class
     * @param {string} classid The ClassID of the class
     * @param {string} domain The Domain of the class
     */
    createGame(classid: string, host: IUser, hostSocket: SocketIO.Socket): Game {
        let game = new Game(classid, {}, host, hostSocket);
        this.games[classid] = game;
        return game;
    }

    deleteGame(classid: string) {
        this.games.delete(classid);
    }
}
