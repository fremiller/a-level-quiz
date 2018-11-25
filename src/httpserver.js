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

const nocache = require('nocache');

exports.HTTPServer = class HTTPServer extends Module {
    constructor(callback) {
        super("HTTPServer");

        /**
         * The only HTTPserver instance
         * @static
         */
        HTTPServer.singleton = this;
        this.app = express();
        this.http = require("http").Server(this.app);
        this.io = require("socket.io")(this.http);

        this.app.use(nocache());
        this.app.use(express.static('public'));
    }

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

        this.app.get("/users/register", async function (req, res) {
            httpServerInstance.log("[REQUEST] /users/register")
            if (!VerifyParams(req, ["name"])) {
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
            if (!VerifyParams(req, ["token"])) {
                res.status(402).send("Failed to sign in. Invalid parameters");
            }
            try {
                let user = await auth.GetUserFromToken(req.query.id, req.query.token, true);
                res.json(user);
            } catch (err) {
                this.log(err);
                res.status(403).send(err);
            }
        });

        this.app.get("/topics/list", async function (req, res) {
            res.json({})
        })

        this.app.get("/classes/list", async function (req, res) {
            classroom.getClasses(req.query.token, true, (body => {
                res.json(body)
            }));
        });

        this.app.get("/games/data", async function (req, res) {
            let d = await Database.singleton.getGameInfo(req.query.gameid);
            res.json(d);
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