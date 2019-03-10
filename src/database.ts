/**
 * Interface with the local mongodb server
 * @module src/database
 */

import * as mongoose from "mongoose";
import * as models from "./models";
let config = require("../quizconfig.json");
import { Module } from "./module";
import { exec } from "child_process";
var initTried = false;

const questions = config.questions;

export interface IGameData {
    classId: string,
    timestamp: string,
    players: IUserGameStatsData[]
    questions: models.IQuestionDocument[]
}

export interface IUserGameStatsData extends models.IUserGameStats {
    details: models.IUser
}

export interface QuestionData extends models.IQuestion {
    userAnswers: number[]
}

/**
 * Contains a database connection and helper functions
 */
export class Database extends Module {
    /**
     * Connects to a database
     * @param {function} callback Runs when the setup is complete
     */

    static singleton: Database;
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
        console.log("\tConnecting")
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
                throw "Failed to connect to database"
            } else {
                console.log("Unable to connect to database. Attempting to start");
                initTried = true;
                exec("service mongod start", (err, stdout, stderr) => {
                    if (err) {
                        if (err.message.includes("Access denied")) {
                            throw "Unable to start service. Run this server as root or start mongo service manually"
                        } else {
                            throw "Unable to start service:\n" + err.message
                        }
                    }
                    setTimeout(this.init, 1000, callback);
                })
            }
        });
    }

    /**
     * Adds a UserGameStats to the database
     * @param {UserGameStats} stats The UserGameStats to add
     */
    async addUserGameStats(stats: models.IUserGameStats) {
        let stat = new models.UserGameStats(stats);
        stat = await stat.save();
        return stat;
    }

    /**
     * Adds a GameStats to the database
     * @param {GameStats} stats The GameStats to add
     */
    async addGameStats(stats: models.IGameStats) {
        let stat = new models.GameStats(stats);
        stat = await stat.save();
        return stat;
    }

    /**
     * Updates the user object with the specified game
     * Runs when the game has finished
     * @param {string} userid The ID of the user
     * @param {string} gameid The ID of the game to add
     */
    async addGameToUser(userid: string, classId: string, timestamp: string) {
        let p = await this.getUserFromGoogleID(userid);
        p.previousGames.push(`${classId}:${timestamp}`);
        return await p.save();
    }

    async addQuestion(questionObj) {
        let q = new models.Question(questionObj);
        q = await q.save();
        return q;
    }

    async addQuestionsFromConfig() {
        config.questions.forEach(async (q) => {
            await this.addQuestion(q);
        })
    }

    async getUserPastGames(userid: string) {
        let games = await models.UserGameStats.find({
            userId: userid
        }).exec();
        return games;
    }

    /**
     * Gets a user from the database with the given googleid
     * @param {string} id The googleid to get
     * @returns {(User|undefined)}
     */
    async getUserFromGoogleID(id) {
        let model = await models.User.find().where("googleid").equals(id).exec();
        if (model.length == 0) {
            return undefined;
        }
        return model[0];
    }

    /**
     * Adds a user to the database
     * @param {Object} userObj The user to add
     */
    async CreateUser(userObj) {
        let usr = new models.User(userObj);
        usr = await usr.save();
        return usr;
    }

    /**
     * Gets a random question from the database
     */
    GetRandomQuestion(): Promise<models.IQuestionDocument> {
        return new Promise((resolve, reject) => {
            models.Question.count({}).exec(function (err, count) {
                var random = Math.floor(Math.random() * count)
                models.Question.findOne().skip(random).exec(
                    function (err, result) {
                        if (result) {
                            resolve(result.toObject())
                        }
                    })
            })
        })
    }

    async getStudentGameInfo(classId: string, timestamp: string, userid: string): Promise<IGameData|any>{
        console.log(`Class: ${classId} Time: ${timestamp}`)
        let game = await models.GameStats.find({
            classId: classId,
            timestamp: timestamp
        }).exec();
        console.log("QQ" + game)

        let players = await models.UserGameStats.find({
            classId: classId,
            timestamp: timestamp,
            userId: userid
        }).exec();
        if (players.length == 0) {
            return {
                "error": "No game with id"
            }
        }

        let pJ: IUserGameStatsData[] = []
        for (let i = 0; i < players.length; i++) {
            let p = players[i];
            let new_p: IUserGameStatsData = {
                position: p.position,
                questions: p.questions,
                userId: p.userId,
                details: await this.getUserFromGoogleID(p.userId),
                classId: p.classId,
                timestamp: p.timestamp
            }
            pJ.push(new_p);
        }

        let qids = game[0].questions;
        let questions: models.IQuestionDocument[] = [];
        for (let i = 0; i < qids.length; i++) {
            let q = await this.GetQuestionById(qids[i]);
            questions.push(q);
        }

        let gameData: IGameData = {
            classId: classId,
            timestamp: timestamp,
            questions: questions,
            players: pJ
        }
        return gameData;
    }

    async getTeacherGameInfo(classId: string, timestamp: string): Promise<IGameData|any> {
        console.log(`Class: ${classId} Time: ${timestamp}`)
        let game = await models.GameStats.find({
            classId: classId,
            timestamp: timestamp
        }).exec();
        console.log("QQ" + game)

        let players = await models.UserGameStats.find({
            classId: classId,
            timestamp: timestamp
        }).exec();
        if (players.length == 0) {
            return {
                "error": "No game with id"
            }
        }

        let pJ: IUserGameStatsData[] = []
        for (let i = 0; i < players.length; i++) {
            let p = players[i];
            let new_p: IUserGameStatsData = {
                position: p.position,
                questions: p.questions,
                userId: p.userId,
                details: await this.getUserFromGoogleID(p.userId),
                classId: p.classId,
                timestamp: p.timestamp
            }
            pJ.push(new_p);
        }

        let qids = game[0].questions;
        let questions: models.IQuestionDocument[] = [];
        for (let i = 0; i < qids.length; i++) {
            let q = await this.GetQuestionById(qids[i]);
            questions.push(q);
        }

        let gameData: IGameData = {
            classId: classId,
            timestamp: timestamp,
            questions: questions,
            players: pJ
        }
        return gameData;
    }


    GetQuestionById(_qid): Promise<models.IQuestionDocument> {
        return new Promise((resolve, reject) => {
            models.Question.findById(_qid, function (err, question) {
                resolve(question);
            })
        })
    }
}