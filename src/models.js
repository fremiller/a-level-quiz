var mongoose = require("./database").mongoose;
/**
 * UserGameStats
 * 
 * This is a structure used in the User and GameStats object
 * to store the performance of one user in one game.
 * 
 * 
 * gameId - The ID of the game which can be used to find other players in the game
 * timeStamp - The time when the game finished
 * score - The score that the user got
 * percentageCorrect - What percentage of questions the user got correct
 * position - What position the player came in the leaderboard
 * userId - The ID of the user which can be used to get details of the user
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
 * GameStats
 * 
 * This is a structure stored by itself. It stores the IDs of all the players
 * in the game which can be used to find statistics about each player.
 * 
 * gameId - The ID of the game
 * players - A list of player IDs which can be used to find players
 * timeStamp - The time that the game finished
 */
var GameStatsSchema = {
    gameId: String,
    players: [String],
    timeStamp: String,
}
/**
 *  UserType
 * 
 *  This is an enum which is used in the user object to store the type of the user
 */
let UserType = exports.UserType = {
    "STUDENT": 0,
    "TEACHER": 1,
    "ADMIN": 2
}

/**
 * User
 * 
 * name - The user's real name
 * googleid - The GoogleId of the user
 * previousGames - The IDs of the previous games that the user has played
 * domain - The school domain that the user signed up with
 * profileImage - The URL to the profile image of the user
 * userType - The type of the user
 */
var UserSchema = {
    name: String,
    googleid: String,
    previousGames: [String],
    domain: String,
    profileImage: String,
    userType: Number,
}


/**
 * init
 * 
 * This function initialises all the models for the database object to use
 */
exports.init = function() {
    console.log("[MODELS] Initialising User Model")
    exports.User = mongoose.model("User", UserSchema);
    console.log("[MODELS] Initialising UserGameStats Model")
    exports.UserGameStats = mongoose.model("UserGameStats", UserGameStatsSchema);
    console.log("[MODELS] Initialising GameStats Model")
    exports.GameStats = mongoose.model("GameStats", GameStatsSchema);
}