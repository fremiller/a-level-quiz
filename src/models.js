var mongoose = require("./database").mongoose;
/**
 * @var UserGameStats
 * 
 * This is a structure used in the User and GameStats object
 * to store the performance of one user in one game.
 * 
 * 
 * @property {string} gameId - The ID of the game which can be used to find other players in the game
 * @property {string} timeStamp - The time when the game finished
 * @property {number} score - The score that the user got
 * @property {number} percentageCorrect - What percentage of questions the user got correct
 * @property {number} position - What position the player came in the leaderboard
 * @property {string} userId - The ID of the user which can be used to get details of the user
 */
var UserGameStatsSchema = {
    gameId: String,
    timeStamp: String,
    score: Number,
    percentageCorrect: Number,
    position: Number,
    userId: String
}

/**
 * 
 * This is a structure stored by itself. It stores the IDs of all the players
 * in the game which can be used to find statistics about each player.
 * 
 * @property {string} gameId The ID of the game
 * @property {string[]} players A list of player IDs which can be used to find players
 * @property {string} timeStamp The time that the game finished
 */
var GameStatsSchema = {
    gameId: String,
    players: [String],
    timeStamp: String,
}
/**
 * 
 *  This is an enum which is used in the user object to store the type of the user
 *  @enum {number}
 */
let UserType = exports.UserType = {
    /** The user is a student */
    "STUDENT": 0,
    /** The user is a teacher */
    "TEACHER": 1,
    /** The user is an administrator */
    "ADMIN": 2
}

/**
 * User
 * 
 * @property {string} name The user's real name
 * @property {string} googleid The GoogleId of the user
 * @property {string} previousGames The IDs of the previous games that the user has played
 * @property {string} domain The school domain that the user signed up with
 * @property {string} profileImage The URL to the profile image of the user
 * @property {number} userType The type of the user
 * @property {object[]} classes All the google classroom classes the user belongs to
 * @property {string} classes.name The name of the class
 * @property {string} classes.id The Google Classroom ID of the class
 */
var UserSchema = {
    name: String,
    googleid: String,
    previousGames: [String],
    domain: String,
    profileImage: String,
    userType: Number,
    classes: [{
        name: String,
        id: String
    }]
}


/**
 * This function initialises all the models for the database object to use
 */
exports.init = function() {
    console.log("[MODELS] Initialising User Model");
    exports.User = mongoose.model("User", UserSchema);
    console.log("[MODELS] Initialising UserGameStats Model");
    exports.UserGameStats = mongoose.model("UserGameStats", UserGameStatsSchema);
    console.log("[MODELS] Initialising GameStats Model");
    exports.GameStats = mongoose.model("GameStats", GameStatsSchema);
}