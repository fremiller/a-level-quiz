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
    /**
     * The only instance of this class
     */
    static singleton: GameManager;
    /**
     * The socket.io server
     */
    io: SocketIO.Server
    /**
     * The games that this instance is responsible for
     */
    games: Map<String, Game>
    /**
     * @constructor
     * @description Adds the onConnection method to the server
     */
    constructor() {
        super("GameManager");
        GameManager.singleton = this;
        this.log("Initializing IO object");
        this.games = new Map<String, Game>();
        this.io = HTTPServer.singleton.io;
        // Setup the onConnection event
        this.io.on("connection", this.onConnection);
    }

    /**
     * Runs when a new socket connects.
     * Sets up all socket.io events for the user
     * @param {Socket} socket 
     */
    async onConnection(socket: SocketIO.Socket) {
        const gameManager = GameManager.singleton;
        gameManager.log("[GAME] New socket connection")
        // The user's access code
        let code = socket.request._query.code;
        // The user's access token
        let token = socket.request._query.token;
        // Whether to create a game or not
        let createGame = socket.request._query.createGame;

        if ((!code || !token) && !createGame) {
            gameManager.log("[ERROR][GAME] Invalid Join Parameters")
            socket.emit("displayError", {
                "text": "Invalid Parameters"
            });
            return;
        }
        // Get the user's information
        gameManager.log("[INFO][GAME] Getting user")
        let user = await auth.getUserFromToken(token);
        gameManager.log("[INFO][GAME] Getting game")
        if (createGame) {
            // Create the game
            gameManager.createGame(code, user, socket)
        }
        else {
            // Find the game
            let game = gameManager.getGameByCode(code);
            if (!game) {
                gameManager.log("[ERROR][GAME] Invalid Game Code")
                socket.emit("displayError", {
                    "text": "Invalid game code"
                });
                return;
            }
            console.log(`${user.name} is joining ${code}`);
            // Join the game
            game.joinGame(user, socket);
        }
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

    /**
     * Deletes a game based on it's class ID
     * @param classid The classID to delete
     */
    deleteGame(classid: string) {
        this.games.delete(classid);
    }
}
