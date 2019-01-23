/**
 * HTTP server module
 * @module src/httpserver
 */

import * as express from "express";

import { Database } from "./database";
import {Module} from "./module";
import * as auth from "./auth";
import { GameManager } from "./gamemanager";
import * as  classroom from "./classroom"
import {Admin} from "./admin";
import * as socketio  from "socket.io";

import * as nocache from 'nocache';
import * as http from "http";

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
    }

    /**
     * Adds all HTTP routes and starts the server
     * @returns {Promise} Resolves when the HTTP server is listening
     */
    setup(): Promise<Object>{
        let httpServerInstance = this;
        this.app.get("/games/user", async function (req, res) {
            let usr = await auth.getUserFromToken(req.query.id);
            let clasWithGame = [];
            let classes;
            if(usr.classes.toObject){
                classes = usr.classes.toObject();
            }
            else{
                classes = usr.classes;
            }
            classes.forEach((clas) => {
                let gam = GameManager.singleton.getGameByCode(clas.id, usr.domain)
                if (gam) {
                    let c = clas;
                    c.gameInfo = gam.toJSON();
                    clasWithGame.push(c);
                }
            })
            res.json({
                classesWithGames: clasWithGame
            })
        })

        this.app.get("/admin/status", async function(req, res){
            if(!await auth.VerifyAdmin(req.query.token)){
                httpServerInstance.log("User not admin")
                res.json({
                    "message": "go away"
                });
                return;
            }
            let AS = Admin.singleton.getAdminState()
            res.json(AS)
        })

        this.app.post("/admin/accounts/create", async function(req, res){
            if(!await auth.VerifyAdmin(req.query.token)){
                httpServerInstance.log("User not admin")
                res.json({
                    "message": "go away"
                });
                return;
            }
            Admin.singleton.makeTestAccount(req.query.isTeacher == "true");
        })

        this.app.post("/admin/accounts/delete", async function(req, res){
            if(!await auth.VerifyAdmin(req.query.token)){
                httpServerInstance.log("User not admin")
                res.json({
                    "message": "go away"
                });
                return;
            }
            Admin.singleton.deleteTestAccount(req.query.index);
        })

        this.app.get("/users/register", async function (req, res) {
            httpServerInstance.log("[REQUEST] /users/register")
            if (!httpServerInstance.VerifyParams(req, ["name"])) {
                res.status(402).send("Failed to add user. Invalid parameters");
                return;
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
                res.status(402).send("Failed to sign in. Invalid parameters");
            }
            try {
                let user = await auth.getUserFromToken(req.query.id, req.query.token, true);
                res.json(user);
            } catch (err) {
                httpServerInstance.log(err);
                res.status(403).send(err);
            }
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

        this.app.get("/games/me", async function(req, res){
            let userid = await auth.getUserIDFromToken(req.query.token);
            console.log(userid);
            res.json(await Database.singleton.getUserPastGames(userid));
        })

        this.app.post("/games/create", async function (req, res) {
            httpServerInstance.log("[REQUEST] /games/create")
            res.json(GameManager.singleton.createGame(req.query.class));
        });

        return new Promise(function(resolve, reject){
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
    VerifyParams(req: Express.Request, params: string[]) :boolean{
        for (let i = 0; i < params.length; i++) {
            if (!req.query[params[i]]) {
                return false;
            }
        }
        return true;
    }
}