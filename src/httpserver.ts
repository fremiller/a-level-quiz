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
import { Request } from "express-serve-static-core";

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
    /**
     * The only instance of this class
     */
    static singleton: HTTPServer;
    /**
     * The express server
     */
    app: express.Express;
    /**
     * The HTTP server
     */
    http: http.Server;
    /**
     * The socket.io server
     */
    io: socketio.Server;
    constructor() {
        super("HTTPServer");
        HTTPServer.singleton = this;
        // Create the express server
        this.app = express();
        // Create the HTTP server based on the express server
        this.http = new http.Server(this.app);
        // Attach the socket.io server to the HTTP server
        this.io = socketio(this.http);
        // Stops browsers from caching files
        this.app.use(nocache());
        // Sets the public folder as the folder to direct requests to
        this.app.use(express.static('public'));

        // Intercept each request
        this.app.use((req, res, next) => {
            const logfilter = ["/admin/status"]
            try {
                if (logfilter.indexOf(req.path) == -1) {
                    // Log the request
                    this.log(req.path)
                }
                // Run the request
                next()
                // Cancel the request in 2 seconds
                res.setTimeout(2000, () => {
                    res.status(500)
                    res.send("Timeout. Try again later")
                })
            }
            catch (e) {
                // Send an error correctly if one is thrown
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
        this.app.get("/games/user", 
        /**
         * Gets all the running games that a user has in their class
         * @param req The express request
         * @param res The express response
         */
        async function (req: Request, res: express.Response) {
            // Get the user info
            let hrstart = process.hrtime();
            let user = await auth.getUserFromToken(req.query.id);
            let runningGames = [];
            let classes = user.classes;
            // Uses 'clas' here as class is a keyword
            classes.forEach((clas) => {
                // Gets the game and adds it to the list if it exists
                let game = GameManager.singleton.getGameByCode(clas.id)
                if (game) {
                    let c = clas;
                    //@ts-ignore
                    c.gameInfo = game.getDetails();
                    runningGames.push(c);
                }
            })
            let hrend = process.hrtime(hrstart)
            console.log(`Execution Time: ${hrend[0]}s ${hrend[1]/1000000}ms`)
            // Return list of games
            res.json({
                classesWithGames: runningGames
            })
        })

        this.app.get("/admin/status", async function (req, res) {
            /**
             * Gets the status of the system for the admin dashboard
             */
            if (!await auth.VerifyAdmin(req.query.token)) {
                // User is not authorised
                throw new NotAuthorizedError();
            }
            // Run the getAdminState function
            let AS = Admin.singleton.getAdminState()
            res.json(AS)
        })

        this.app.post("/admin/accounts/create", async function (req, res) {
            /**
             * Create a test account
             */
            if (!await auth.VerifyAdmin(req.query.token)) {
                // The user is not authorized
                throw new NotAuthorizedError();
            }
            // Create the test acount
            Admin.singleton.makeTestAccount(req.query.isTeacher == "true");
            res.json({
                success: true
            })
        })

        this.app.post("/admin/accounts/delete", async function (req, res) {
            /**
             * Delete a test account
             */
            if (!await auth.VerifyAdmin(req.query.token)) {
                // User is not authorized
                throw new NotAuthorizedError();
            }
            // Delete the test account
            Admin.singleton.deleteTestAccount(req.query.index);
            res.json({
                success: true
            })
        })

        this.app.post("/users/login", async function (req, res) {
            /**
             * Log in the user
             */
            httpServerInstance.log("[REQUEST] /users/login");
            // There must be the token parameter
            if (!httpServerInstance.VerifyParams(req, ["token"])) {
                throw new ParameterError();
            }
            let user = await auth.getUserFromToken(req.query.id, req.query.token, true);
            // Sends the user's info as a response
            res.json(user);
        });

        this.app.get("/topics/list", async function (req, res) {
            // Add this feature later
            res.json({})
        });

        this.app.get("/classes/list", async function (req, res) {
            /**
             * Gets all the classes that the user is in.
             */
            classroom.getClasses(req.query.token, true).then(body => {
                res.json(body)
            });
        });

        this.app.get("/games/data/teacher", async function (req, res) {
            /**
             * Gets all GameUserInfo for a specific game.
             * Requires a timestamp and classid
             */
            let user = await auth.getUserFromToken(req.query.token);
            if (user.userType != 1) {
                return
            }
            let d = await Database.singleton.getTeacherGameInfo(req.query.classId, req.query.timestamp);
            res.json(d);
        })

        this.app.get("/games/data/student", async function (req, res) {
            /**
            * Gets all GameUserInfo for a specific game.
            * Requires a timestamp and classid
            */
            let user = await auth.getUserFromToken(req.query.token);
            let d = await Database.singleton.getStudentGameInfo(req.query.classId, req.query.timestamp, user.googleid);
            res.json(d);
        })

        this.app.get("/games/me", async function (req, res) {
            /**
             * Gets the past games of a user. If the id is given, it gets that user,
             * otherwise it gets the past games of the user which sent the request
             */
            // Get the user which sent the request
            let user = await auth.getUserFromToken(req.query.token);
            // If the user is a teacher, and they requested another user's id
            if (user.userType != 1 && user.googleid != req.query.id && req.query.id != undefined) {
                // Return as they are not authorised.
                return
            }
            // Gets the user info of the user if it is not the user which sent the request
            let idToFind = user.googleid;
            let userInfoRaw;
            if(user.googleid != req.query.id && req.query.id != undefined){
                idToFind = req.query.id;
                userInfoRaw = await Database.singleton.getUserFromGoogleID(idToFind);
            }
            // Send the response
            res.json({
                games: await Database.singleton.getUserPastGames(idToFind),
                userinfo: {
                    // The userinforaw is only included if it is available.
                    name: userInfoRaw?userInfoRaw.name:""
                }
            });
        })

        // Returns a promise which resolves when the server is ready
        return new Promise(function (resolve, reject) {
            const port = process.env.PORT || 8000;
            // Listen on the specified port
            httpServerInstance.http.listen(port, function () {
                httpServerInstance.log("Server listening on port "+port);
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
        // For each parameter
        for (let i = 0; i < params.length; i++) {
            if (!req.query[params[i]]) {
                // If the parameter is not in the request, return false
                return false;
            }
        }
        return true;
    }
}