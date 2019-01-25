"use strict";
/**
 * Interface with the local mongodb server
 * @module src/database
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
const mongoose = require("mongoose");
const models = require("./models");
let config = require("../quizconfig.json");
const module_1 = require("./module");
const child_process_1 = require("child_process");
var initTried = false;
const questions = config.questions;
/**
 * Contains a database connection and helper functions
 */
class Database extends module_1.Module {
    constructor(callback) {
        super("Database");
        /**
         * The reference to the only instance of the class
         * @type {Database}
         * @static
         */
        Database.singleton = this;
        this.init(callback);
    }
    /**
     * Connects to the database
     * @param {function} callback Runs on completion
     */
    init(callback) {
        models.init();
        console.log("\tConnecting");
        mongoose.connect("mongodb://localhost:27017/quiztest", {
            useNewUrlParser: true
        });
        var db = mongoose.connection;
        if (!initTried) {
            db.once('open', function () {
                console.log("\r\tConnected");
                //Database.singleton.addQuestionsFromConfig();
                callback();
            });
        }
        db.on('error', function () {
            if (initTried) {
                throw "Failed to connect to database";
            }
            else {
                console.log("Unable to connect to database. Attempting to start");
                initTried = true;
                child_process_1.exec("service mongod start", (err, stdout, stderr) => {
                    if (err) {
                        if (err.message.includes("Access denied")) {
                            throw "Unable to start service. Run this server as root or start mongo service manually";
                        }
                        else {
                            throw "Unable to start service:\n" + err.message;
                        }
                    }
                    setTimeout(this.init, 1000, callback);
                });
            }
        });
    }
    /**
     * Adds a UserGameStats to the database
     * @param {UserGameStats} stats The UserGameStats to add
     */
    addUserGameStats(stats) {
        return __awaiter(this, void 0, void 0, function* () {
            let stat = new models.UserGameStats(stats);
            stat = yield stat.save();
            return stat;
        });
    }
    /**
     * Adds a GameStats to the database
     * @param {GameStats} stats The GameStats to add
     */
    addGameStats(stats) {
        return __awaiter(this, void 0, void 0, function* () {
            let stat = new models.GameStats(stats);
            stat = yield stat.save();
            return stat;
        });
    }
    /**
     * Updates the user object with the specified game
     * Runs when the game has finished
     * @param {string} userid The ID of the user
     * @param {string} gameid The ID of the game to add
     */
    addGameToUser(userid, classId, timestamp) {
        return __awaiter(this, void 0, void 0, function* () {
            let p = yield this.getUserFromGoogleID(userid);
            p.previousGames.push(`${classId}:${timestamp}`);
            return yield p.save();
        });
    }
    addQuestion(questionObj) {
        return __awaiter(this, void 0, void 0, function* () {
            let q = new models.Question(questionObj);
            q = yield q.save();
            return q;
        });
    }
    addQuestionsFromConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            config.questions.forEach((q) => __awaiter(this, void 0, void 0, function* () {
                yield this.addQuestion(q);
            }));
        });
    }
    getUserPastGames(userid) {
        return __awaiter(this, void 0, void 0, function* () {
            let games = yield models.UserGameStats.find({
                userId: userid
            }).exec();
            return games;
        });
    }
    /**
     * Gets a user from the database with the given googleid
     * @param {string} id The googleid to get
     * @returns {(User|undefined)}
     */
    getUserFromGoogleID(id) {
        return __awaiter(this, void 0, void 0, function* () {
            let model = yield models.User.find().where("googleid").equals(id).exec();
            if (model.length == 0) {
                return undefined;
            }
            return model[0];
        });
    }
    /**
     * Adds a user to the database
     * @param {Object} userObj The user to add
     */
    CreateUser(userObj) {
        return __awaiter(this, void 0, void 0, function* () {
            let usr = new models.User(userObj);
            usr = yield usr.save();
            return usr;
        });
    }
    /**
     * Gets a random question from the database
     */
    GetRandomQuestion() {
        return new Promise((resolve, reject) => {
            models.Question.count({}).exec(function (err, count) {
                var random = Math.floor(Math.random() * count);
                models.Question.findOne().skip(random).exec(function (err, result) {
                    if (result) {
                        resolve(result.toObject());
                    }
                });
            });
        });
    }
    getGameInfo(classId, timestamp) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Class: ${classId} Time: ${timestamp}`);
            let game = yield models.GameStats.find({
                classId: classId,
                timestamp: timestamp
            }).exec();
            console.log("QQ" + game);
            let players = yield models.UserGameStats.find({
                classId: classId,
                timestamp: timestamp
            }).exec();
            if (players.length == 0) {
                return {
                    "error": "No game with id"
                };
            }
            let pJ = [];
            for (let i = 0; i < players.length; i++) {
                let p = players[i];
                let new_p = {
                    position: p.position,
                    questions: p.questions,
                    userId: p.userId,
                    details: yield this.getUserFromGoogleID(p.userId),
                    classId: p.classId,
                    timestamp: p.timestamp
                };
                pJ.push(new_p);
            }
            let qids = game[0].questions;
            let questions = [];
            for (let i = 0; i < qids.length; i++) {
                let q = yield this.GetQuestionById(qids[i]);
                questions.push(q);
            }
            let gameData = {
                classId: classId,
                timestamp: timestamp,
                questions: questions,
                players: pJ
            };
            return gameData;
        });
    }
    GetQuestionById(_qid) {
        return new Promise((resolve, reject) => {
            models.Question.findById(_qid, function (err, question) {
                resolve(question);
            });
        });
    }
}
exports.Database = Database;
//# sourceMappingURL=database.js.map