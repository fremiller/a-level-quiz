/**
 * HTTP server module
 * @module src/httpserver
 */

import * as express from "express";

import { Database } from "./database";
import { Module } from "./module";
import * as auth from "./auth";
import { GameManager } from "./gamemanager";
import * as  classroom from "./classroom"
import { Admin } from "./admin";
import * as socketio from "socket.io";

import * as nocache from 'nocache';
import * as http from "http";

export class NotAuthorizedError extends Error {
    constructor() {
        super("Not Authorized")
    }
}

export class ParameterError extends Error {
    constructor() {
        super("Invalid Parameters")
    }
}

/**
 * Manages all http communication
 * @extends Module
 */
export class HTTPServer extends Module {
    static singleton: HTTPServer;
    app: express.Express;
    http: http.Server;
    io: socketio.Server;
    constructor() {
        super("HTTPServer");

        /**
         * The only HTTPserver instance
         * @static
         * @type {HTTPServer}
         */
        HTTPServer.singleton = this;
        this.app = express();
        this.http = new http.Server(this.app);
        this.io = socketio(this.http);

        this.app.use(nocache());
        this.app.use(express.static('public'));

        this.app.use((req, res, next) => {
            const logfilter = ["/admin/status"]
            try {
                if (logfilter.indexOf(req.path) == -1) {
                    this.log(req.path)
                }
                next()
                res.setTimeout(2000, ()=>{
                    res.status(500)
                    res.send("Timeout. Try again later")
                })
            }
            catch (e) {
                if (e instanceof NotAuthorizedError || e instanceof ParameterError || e instanceof auth.TestAccountError) {
                    res.send({
                        result: "error",
                        error: e.message
                    })
                }
                else {
                    console.error("Unknown Error: " + e)
                    res.json({
                        result: "error",
                        error: "Unknown Error"
                    })
                }
            }
        })
    }

    /**
     * Adds all HTTP routes and starts the server
     * @returns {Promise} Resolves when the HTTP server is listening
     */
    setup(): Promise<Object> {
        let httpServerInstance = this;
        this.app.get("/games/user", async function (req, res) {
            let usr = await auth.getUserFromToken(req.query.id);
            let clasWithGame = [];
            let classes = usr.classes;
            classes.forEach((clas) => {
                let gam = GameManager.singleton.getGameByCode(clas.id)
                if (gam) {
                    let c = clas;
                    //@ts-ignore
                    c.gameInfo = gam.getDetails();
                    clasWithGame.push(c);
                }
            })
            res.json({
                classesWithGames: clasWithGame
            })
        })

        this.app.get("/admin/status", async function (req, res) {
            if (!await auth.VerifyAdmin(req.query.token)) {
                throw new NotAuthorizedError();
            }
            let AS = Admin.singleton.getAdminState()
            res.json(AS)
        })

        this.app.post("/admin/accounts/create", async function (req, res) {
            if (!await auth.VerifyAdmin(req.query.token)) {
                throw new NotAuthorizedError();
            }
            Admin.singleton.makeTestAccount(req.query.isTeacher == "true");
            res.json({
                success: true
            })
        })

        this.app.post("/admin/accounts/delete", async function (req, res) {
            if (!await auth.VerifyAdmin(req.query.token)) {
                throw new NotAuthorizedError();
            }
            Admin.singleton.deleteTestAccount(req.query.index);
            res.json({
                success: true
            })
        })

        this.app.get("/users/register", async function (req, res) {
            httpServerInstance.log("[REQUEST] /users/register")
            if (!httpServerInstance.VerifyParams(req, ["name"])) {
                throw new ParameterError();
            }
            let usr = await Database.singleton.CreateUser({
                name: req.query.name,
                previousGames: []
            });
            res.json(usr.toJSON());
        });

        this.app.post("/users/login", async function (req, res) {
            httpServerInstance.log("[REQUEST] /users/login");
            if (!httpServerInstance.VerifyParams(req, ["token"])) {
                throw new ParameterError();
            }
            let user = await auth.getUserFromToken(req.query.id, req.query.token, true);
            res.json(user);
        });

        this.app.get("/topics/list", async function (req, res) {
            res.json({})
        });

        this.app.get("/classes/list", async function (req, res) {
            classroom.getClasses(req.query.token, true).then(body => {
                res.json(body)
            });
        });

        this.app.get("/games/data", async function (req, res) {
            /**
             * Gets all GameUserInfo for a specific game.
             * Requires a timestamp and classid
             */
            let userid = await auth.getUserIDFromToken(req.query.token);
            let d = await Database.singleton.getGameInfo(req.query.classId, req.query.timestamp);
            res.json(d);
        })

        this.app.get("/games/me", async function (req, res) {
            let userid = await auth.getUserIDFromToken(req.query.token);
            console.log(userid);
            res.json(await Database.singleton.getUserPastGames(userid));
        })

        return new Promise(function (resolve, reject) {
            httpServerInstance.http.listen("8000", function () {
                httpServerInstance.log("Server listening on port 8000");
                resolve();
            });
        })
    }

    /**
     * This makes sure that a request contains the required query parameters
     * @param {Request} req The request to check
     * @param {string[]} params The required parameters
     */
    VerifyParams(req: express.Request, params: string[]): boolean {
        for (let i = 0; i < params.length; i++) {
            if (!req.query[params[i]]) {
                return false;
            }
        }
        return true;
    }
}