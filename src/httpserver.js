/**
 * HTTP server module
 * @module src/httpserver
 */

var express = require("express");

var { Database } = require("./database");
let { Module } = require("./module");
let auth = require("./auth");;
let { GameManager } = require("./gamemanager");
let classroom = require("./classroom")
let {Admin} = require("./admin");

const nocache = require('nocache');

/**
 * Manages all http communication
 * @extends Module
 */
exports.HTTPServer = class HTTPServer extends Module {
    constructor() {
        super("HTTPServer");

        /**
         * The only HTTPserver instance
         * @static
         * @type {HTTPServer}
         */
        HTTPServer.singleton = this;
        this.app = express();
        this.http = require("http").Server(this.app);
        this.io = require("socket.io")(this.http);

        this.app.use(nocache());
        this.app.use(express.static('public'));
    }

    /**
     * Adds all HTTP routes and starts the server
     * @returns {Promise} Resolves when the HTTP server is listening
     */
    setup(){
        let httpServerInstance = this;
        this.app.get("/games/user", async function (req, res) {
            let usr = await auth.GetUserFromToken(req.query.id);
            let clasWithGame = [];
            let classes = usr.classes.toObject();
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
            if(!auth.VerifyAdmin(req.query.token)){
                httpServerInstance.log("User not admin")
                res.json(403, {
                    "message": "go away"
                });
                return;
            }
            res.json({
                "console": Admin.singleton.log,
                "status": "Online",
                "users": 1000
            })
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
                let user = await auth.GetUserFromToken(req.query.id, req.query.token, true);
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
            classroom.getClasses(req.query.token, true, (body => {
                res.json(body)
            }));
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
    VerifyParams(req, params) {
        for (let i = 0; i < params.length; i++) {
            if (!req.query[params[i]]) {
                return false;
            }
        }
        return true;
    }
}