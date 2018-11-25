/**
 * Interface with the local mongodb server
 * @module src/database
 */

var mongoose = exports.mongoose = require("mongoose");
var models = exports.models = require("./models");
const { Module } = require("./module");
const {
    exec
} = require('child_process');
var initTried = false;

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
    async addGameToUser(userid, gameid) {
        let p = await this.getUserFromGoogleID(userid);
        p.previousGames.push(gameid);
        return await p.save();
    }

    /**
     * Gets all information about a game
     * @param {string} gameid The gameid to get
     */
    async getGameInfo(gameid) {
        let gameData = {
            gameId: gameid
        };
        let game = await models.GameStats.find().where("gameId").equals(gameid).exec();
        let players = await models.UserGameStats.find().where("gameId").equals(gameid).exec();
        if (players.length == 0) {
            return {
                "error": "No game with id"
            }
        }
        gameData.players = players;
        gameData.players.forEach((p) => {
            p.gameId = undefined;
            p._id = undefined;
            p.__v = undefined;
        })
        return gameData;
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
     * @deprecated
     */
    GetRandomQuestion() {
        return questions[Math.floor(Math.random() * questions.length)]
    }
}

const questions = [
    {
        "question": "One million electrons travel between two points in a circuit.\nThe total energy gained by the electrons is 1.6x10<sup>-10</sup>J.\n\nWhat is the potential difference between the two points?",
        "type": "EXAM",
        "answers": [
            "1.6x10<sup>-16</sup>V",
            "1.6x10<sup>-4</sup>V",
            "1.0x10<sup>3</sup>V",
            "1.0x10<sup>9</sup>V"
        ],
        "correctAnswer": 2,
        "timeLimit": 60,
        "exam": "H556/02 June 2017 Question 2"
    },
    {
        "question": "Which is <strong>not</strong> a unit of energy?",
        "type": "EXAM",
        "timeLimit": 60,
        "answers": [
            "kWh",
            "eV",
            "J",
            "W"
        ],
        "correctAnswer": 3,
        "exam": "H556/02 June 2017 Question 3"
    },
    {
        "question": "A progressive wave of amplitude a has intensity <em>I</em>. This wave combines with another wave of amplitude 0.6 <em>a</em> at a point in space. The phase difference between the waves is 180°.\n\n What is the resultant intensity of the combined waves in terms of <em>I</em>",
        "type": "EXAM",
        "timeLimit": 60,
        "answers": [
            "0.16 <em>I</em>",
            "0.4 <em>I</em>",
            "1.6 <em>I</em>",
            "2.6 <em>I</em>"
        ],
        "correctAnswer": 0,
        "exam": "H556/02 June 2017 Question 5"
    },
    {
        "question": "Stationary waves are produced in a tube closed at one end and open at the other end. The fundamental frequency is 120 Hz.\n\nWhat is a possible frequency for a harmonic for this tube?",
        "type": "EXAM",
        "timeLimit": 60,
        "answers": [
            "60 Hz",
            "240 Hz",
            "360 Hz",
            "480 Hz"
        ],
        "correctAnswer": 2,
        "exam": "H556/02 June 2017 Question 6"
    },
    {
        "question": "A capacitor discharges through a resistor. At time t = 0, the charge stored by the capacitor is 600 μC. The capacitor loses 5.0 % of its charge every second.\n\nWhat is the charge left on the capacitor at time t = 4.0 s?",
        "type": "EXAM",
        "answers": [
            "111 μC",
            "120 μC",
            "480 μC",
            "489 μC"
        ],
        "correctAnswer": 3,
        "timeLimit": 60,
        "exam": "H556/02 June 2017 Question 8"
    },
    {
        "question": "Which statement is correct?",
        "type": "EXAM",
        "answers": [
            "Hadrons are made up of protons and neutrons.",
            "A positron and a proton are examples of leptons.",
            "The positron and the electron have the same mass.",
            "The weak nuclear force is responsible for alpha decay."
        ],
        "correctAnswer": 2,
        "timeLimit": 60,
        "exam": "H556/02 June 2017 Question 10"
    },
    {
        "question": "An electron moves in a circle of radius 2.0 cm in a uniform magnetic field of flux density 170 mT.\n\nWhat is the momentum of this electron?",
        "type": "EXAM",
        "answers": [
            "3.4 × 10<sup>−3</sup>kgms<sup>−1</sup>",
            "5.4 × 10<sup>−17</sup>kgms<sup>−1</sup>",
            "1.4 × 10<sup>−18</sup>kgms<sup>−1</sup>",
            "5.4 × 10<sup>−22</sup>kgms<sup>−1</sup>"
        ],
        "correctAnswer": 3,
        "timeLimit": 60,
        "exam": "H556/02 June 2017 Question 11"
    },
    {
        "question": "A beam of charged particles is not deflected when it passes through a region where both electric and magnetic fields are present.\n\nWhich statement is <strong>not</strong> correct?",
        "type": "EXAM",
        "answers": [
            "All the particles have the same speed.",
            "The resultant force on each particle is zero.",
            "The magnetic force is equal to the electric force on each particle.",
            "The magnetic field and the electric field are in the same direction."
        ],
        "correctAnswer": 0,
        "timeLimit": 60,
        "exam": "H556/02 June 2017 Question 13"
    },
    {
        "question": "There are four important attenuation mechanisms by which X-ray photons may interact when they pass through matter.\n\nIn which mechanism is the X-ray photon scattered with a longer wavelength?",
        "type": "EXAM",
        "answers": [
            "simple scattering",
            "Compton effect",
            "pair production",
            "photoelectric effect"
        ],
        "correctAnswer": 1,
        "timeLimit": 60,
        "exam": "H556/02 June 2017 Question 14"
    }
]