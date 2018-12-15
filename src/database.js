/**
 * Interface with the local mongodb server
 * @module src/database
 */

var mongoose = exports.mongoose = require("mongoose");
var models = exports.models = require("./models");
let config = require("../quizconfig.json");
const { Module } = require("./module");
const {
    exec
} = require('child_process');
var initTried = false;

const questions = config.questions;

/**
 * Contains a database connection and helper functions
 */
exports.Database = class Database extends Module {
    /**
     * Connects to a database
     * @param {function} callback Runs when the setup is complete
     */
    constructor(callback){
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
                    setTimeout(init, 1000, callback);
                })
            }
        });
    }

    /**
     * Adds a UserGameStats to the database
     * @param {UserGameStats} stats The UserGameStats to add
     */
    async addUserGameStats(stats) {
        let stat = new models.UserGameStats(stats);
        stat = await stat.save();
        return stat;
    }

    /**
     * Adds a GameStats to the database
     * @param {GameStats} stats The GameStats to add
     */
    async addGameStats(stats) {
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
    async addGameToUser(userid, classId, timestamp) {
        let p = await this.getUserFromGoogleID(userid);
        p.previousGames.push(`${classId}:${timestamp}`);
        return await p.save();
    }

    async addQuestion(questionObj){
        let q = new models.Question(questionObj);
        q = await q.save();
        return q;
    }

    async addQuestionsFromConfig(){
        config.questions.forEach(async (q)=>{
            await this.addQuestion(q);
        })
    }

    /**
     * Gets all information about a game
     * @param {string} gameid The gameid to get
     */
    async getGameInfo(classId, timestamp) {
        console.log(`Class: ${classId} Time: ${timestamp}`)
        let gameData = {
            classId: classId,
            timestamp: timestamp
        };
        let game = await models.GameStats.find({
            classId: classId,
            timestamp: timestamp
        }).exec();
        console.log("QQ"+game)
        gameData.questions = game[0].questions;
        let players = await models.UserGameStats.find({
            classId: classId,
            timestamp: timestamp
        }).exec();
        if (players.length == 0) {
            return {
                "error": "No game with id"
            }
        }
        
        gameData.players = [];
        for(let i = 0; i < players.length; i++){
            let p = players[i];
            let new_p = {};
            new_p.position = p.position;
            new_p.questions = p.questions;
            new_p.userId = p.userId;
            new_p.details = await this.getUserFromGoogleID(new_p.userId);
            new_p.classId = p.classId;
            gameData.players.push(new_p);
        }
        
        return gameData;
    }

    async getUserPastGames(userid){
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
    GetRandomQuestion() {
        return new Promise((resolve, reject)=>{
            models.Question.count().exec(function (err, count) {
                var random = Math.floor(Math.random() * count)
                models.Question.findOne().skip(random).exec(
                  function (err, result) {
                    resolve(result.toObject())
                  })
              })
        })
    }
}