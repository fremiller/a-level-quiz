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

/**
 * Data about a given game which is sent to clients
 * This is a combination of GameStats and UserGameStats objects
 */
export interface IGameData {
    classId: string,
    timestamp: string,
    players: IUserGameStatsData[]
    questions: models.IQuestionDocument[]
}

/**
 * This is a combination of UserGameStats and User to give to clients
 * to retrive names and account info
 */
export interface IUserGameStatsData extends models.IUserGameStats {
    details: models.IUser
}

/**
 * This is a combination of UserGameStats and question
 */
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
     * @param callback Runs on completion
     */
    init(callback: any) {
        // Initialise the models class
        models.init();

        // Connect to the database
        console.log("\tConnecting")
        mongoose.connect("mongodb://localhost:27017/quiztest", {
            useNewUrlParser: true
        });

        var db = mongoose.connection;
        if (!initTried) {
            // Database open event - Runs when it has connected
            db.once('open', function () {
                // Run the callback given
                console.log("\r\tConnected");
                // This adds questions from the JSON config
                //Database.singleton.addQuestionsFromConfig();
                callback();
            });
        }
        // Database error event - This runs if there is an error connecting
        db.on('error', function () {
            if (initTried) {
                throw "Failed to connect to database"
            } else {
                console.log("Unable to connect to database. Attempting to start");
                initTried = true;
                // Tries to start the mongo service on the local computer
                exec("service mongod start", (err, stdout, stderr) => {
                    if (err) {
                        if (err.message.includes("Access denied")) {
                            throw "Unable to start service. Run this server as root or start mongo service manually"
                        } else {
                            throw "Unable to start service:\n" + err.message
                        }
                    }
                    // Runs after 1s to let the service start
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
        // Create UserGameStat object
        let stat = new models.UserGameStats(stats);
        // Save
        stat = await stat.save();
        return stat;
    }

    /**
     * Adds a GameStats to the database
     * @param {GameStats} stats The GameStats to add
     */
    async addGameStats(stats: models.IGameStats) {
        // Create GameStat object
        let stat = new models.GameStats(stats);
        // Save
        stat = await stat.save();
        return stat;
    }

    /**
     * Updates the user object with the specified game
     * Runs when the game has finished
     * @param {string} userid The ID of the user
     * @param {string} gameid The ID of the game to add
     * @deprecated
     */
    async addGameToUser(userid: string, classId: string, timestamp: string) {
        let p = await this.getUserFromGoogleID(userid);
        p.previousGames.push(`${classId}:${timestamp}`);
        return await p.save();
    }

    /**
     * Adds a question to the database
     * @param questionObj Question to add
     */
    async addQuestion(questionObj:models.IQuestion) {
        let q = new models.Question(questionObj);
        q = await q.save();
        return q;
    }

    /**
     * Adds the questions from the server config file
     */
    async addQuestionsFromConfig() {
        // Loop through each question
        config.questions.forEach(async (q:models.IQuestion) => {
            // Add the question
            await this.addQuestion(q);
        })
    }

    /**
     * Gets all the games that a given user has played
     * @param userid The userid to find past games
     */
    async getUserPastGames(userid: string) {
        let games = await models.UserGameStats.find({
            userId: userid
        }).exec();
        return games;
    }

    /**
     * Gets a user from the database with the given googleid
     * @param id The googleid to get
     */
    async getUserFromGoogleID(id: string): Promise<models.IUserDocument|undefined> {
        let model = await models.User.find().where("googleid").equals(id).exec();
        if (model.length == 0) {
            return undefined;
        }
        return model[0];
    }

    /**
     * Adds a user to the database
     * @param userObj The user to add
     */
    async CreateUser(userObj: models.IUser): Promise<models.IUserDocument> {
        // Create the User object
        let usr = new models.User(userObj);
        // Save
        usr = await usr.save();
        return usr;
    }

    /**
     * Gets a random question from the database
     */
    GetRandomQuestion(): Promise<models.IQuestionDocument> {
        return new Promise((resolve, reject) => {
            // Get the number of questions
            models.Question.count({}).exec(function (err, count) {
                // Generate a random number based on the amount
                var random = Math.floor(Math.random() * count)
                // Find a question
                models.Question.findOne().skip(random).exec(
                    function (err, result) {
                        if (result) {
                            resolve(result.toObject())
                        }
                    })
            })
        })
    }

    /**
     * Gets all information about a game for students
     * This is the same as for teachers, but it does not give out information about all players
     * @param classId The classid of the game
     * @param timestamp The timestamp of the game
     * @param userid The student's userid
     */
    async getStudentGameInfo(classId: string, timestamp: string, userid: string): Promise<IGameData|any>{
        console.log(`Class: ${classId} Time: ${timestamp}`)
        // Find the gamestats object
        let game = await models.GameStats.find({
            classId: classId,
            timestamp: timestamp
        }).exec();
        console.log("QQ" + game)

        // Find the usergamestats that were in that game
        // Filtered by userid so that it only shows one user
        let players = await models.UserGameStats.find({
            classId: classId,
            timestamp: timestamp,
            userId: userid
        }).exec();
        // If there are no players in the game; the game doesn't exist
        if (players.length == 0) {
            return {
                "error": "No game with id"
            }
        }

        // Put all the players in the game in JSON format
        let playerJson: IUserGameStatsData[] = []
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
            playerJson.push(new_p);
        }

        // Find all the questions in the game
        let questionIDs = game[0].questions;
        let questions: models.IQuestionDocument[] = [];
        for (let i = 0; i < questionIDs.length; i++) {
            let question = await this.GetQuestionById(questionIDs[i]);
            questions.push(question);
        }

        let gameData: IGameData = {
            classId: classId,
            timestamp: timestamp,
            questions: questions,
            players: playerJson
        }
        return gameData;
    }


    /**
     * Gets all information about a game
     * Shows all players
     * @param classId The classid of the game
     * @param timestamp The timestamp of the game
     */
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

    /**
     * Gets a question by it's ID
     * @param questionid The questionID to find
     */
    GetQuestionById(questionid: string): Promise<models.IQuestionDocument> {
        return new Promise((resolve, reject) => {
            models.Question.findById(questionid, function (err, question) {
                resolve(question);
            })
        })
    }
}