"use strict";
/**
 * HTTP server module
 * @module src/httpserver
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
const express = require("express");
const database_1 = require("./database");
const module_1 = require("./module");
const auth = require("./auth");
const gamemanager_1 = require("./gamemanager");
const classroom = require("./classroom");
const admin_1 = require("./admin");
const socketio = require("socket.io");
const nocache = require("nocache");
const http = require("http");
/**
 * Manages all http communication
 * @extends Module
 */
class HTTPServer extends module_1.Module {
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
    setup() {
        let httpServerInstance = this;
        this.app.get("/games/user", function (req, res) {
            return __awaiter(this, void 0, void 0, function* () {
                let usr = yield auth.getUserFromToken(req.query.id);
                let clasWithGame = [];
                let classes;
                if (usr.classes.toObject) {
                    classes = usr.classes.toObject();
                }
                else {
                    classes = usr.classes;
                }
                classes.forEach((clas) => {
                    let gam = gamemanager_1.GameManager.singleton.getGameByCode(clas.id, usr.domain);
                    if (gam) {
                        let c = clas;
                        c.gameInfo = gam.toJSON();
                        clasWithGame.push(c);
                    }
                });
                res.json({
                    classesWithGames: clasWithGame
                });
            });
        });
        this.app.get("/admin/status", function (req, res) {
            return __awaiter(this, void 0, void 0, function* () {
                if (!(yield auth.VerifyAdmin(req.query.token))) {
                    httpServerInstance.log("User not admin");
                    res.json({
                        "message": "go away"
                    });
                    return;
                }
                let AS = admin_1.Admin.singleton.getAdminState();
                res.json(AS);
            });
        });
        this.app.post("/admin/accounts/create", function (req, res) {
            return __awaiter(this, void 0, void 0, function* () {
                if (!(yield auth.VerifyAdmin(req.query.token))) {
                    httpServerInstance.log("User not admin");
                    res.json({
                        "message": "go away"
                    });
                    return;
                }
                admin_1.Admin.singleton.makeTestAccount(req.query.isTeacher == "true");
            });
        });
        this.app.post("/admin/accounts/delete", function (req, res) {
            return __awaiter(this, void 0, void 0, function* () {
                if (!(yield auth.VerifyAdmin(req.query.token))) {
                    httpServerInstance.log("User not admin");
                    res.json({
                        "message": "go away"
                    });
                    return;
                }
                admin_1.Admin.singleton.deleteTestAccount(req.query.index);
            });
        });
        this.app.get("/users/register", function (req, res) {
            return __awaiter(this, void 0, void 0, function* () {
                httpServerInstance.log("[REQUEST] /users/register");
                if (!httpServerInstance.VerifyParams(req, ["name"])) {
                    res.status(402).send("Failed to add user. Invalid parameters");
                    return;
                }
                let usr = yield database_1.Database.singleton.CreateUser({
                    name: req.query.name,
                    previousGames: []
                });
                res.json(usr.toJSON());
            });
        });
        this.app.post("/users/login", function (req, res) {
            return __awaiter(this, void 0, void 0, function* () {
                httpServerInstance.log("[REQUEST] /users/login");
                if (!httpServerInstance.VerifyParams(req, ["token"])) {
                    res.status(402).send("Failed to sign in. Invalid parameters");
                }
                try {
                    let user = yield auth.getUserFromToken(req.query.id, req.query.token, true);
                    res.json(user);
                }
                catch (err) {
                    httpServerInstance.log(err);
                    res.status(403).send(err);
                }
            });
        });
        this.app.get("/topics/list", function (req, res) {
            return __awaiter(this, void 0, void 0, function* () {
                res.json({});
            });
        });
        this.app.get("/classes/list", function (req, res) {
            return __awaiter(this, void 0, void 0, function* () {
                classroom.getClasses(req.query.token, true).then(body => {
                    res.json(body);
                });
            });
        });
        this.app.get("/games/data", function (req, res) {
            return __awaiter(this, void 0, void 0, function* () {
                /**
                 * Gets all GameUserInfo for a specific game.
                 * Requires a timestamp and classid
                 */
                let userid = yield auth.getUserIDFromToken(req.query.token);
                let d = yield database_1.Database.singleton.getGameInfo(req.query.classId, req.query.timestamp);
                res.json(d);
            });
        });
        this.app.get("/games/me", function (req, res) {
            return __awaiter(this, void 0, void 0, function* () {
                let userid = yield auth.getUserIDFromToken(req.query.token);
                console.log(userid);
                res.json(yield database_1.Database.singleton.getUserPastGames(userid));
            });
        });
        this.app.post("/games/create", function (req, res) {
            return __awaiter(this, void 0, void 0, function* () {
                httpServerInstance.log("[REQUEST] /games/create");
                res.json(gamemanager_1.GameManager.singleton.createGame(req.query.class));
            });
        });
        return new Promise(function (resolve, reject) {
            httpServerInstance.http.listen("8000", function () {
                httpServerInstance.log("Server listening on port 8000");
                resolve();
            });
        });
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
exports.HTTPServer = HTTPServer;
//# sourceMappingURL=httpserver.js.map