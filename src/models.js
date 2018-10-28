var mongoose = require("./database").mongoose;
/**
 * UserGameStats
 * 
 * This is a structure used in the User and GameStats object
 * to store the performance of one user in one game.
 * 
 */
var UserGameStatsSchema = {
    gameId: String,
    timeStamp: String,
    score: Number,
    percentageCorrect: Number,
    position: Number,
    userId: String
}

var GameStatsSchema = {
    players: [String],
    timeStamp: String,
}

let UserType = exports.UserType = {
    "STUDENT": 0,
    "TEACHER": 1,
    "ADMIN": 2
}

var UserSchema = {
    name: String,
    googleid: String,
    previousGames: [String],
    domain: String,
    profileImage: String,
    userType: Number,
}

exports.User = mongoose.model("User", UserSchema);
exports.UserGameStats = mongoose.model("UserGameStats", UserGameStatsSchema);
exports.GameStats = mongoose.model("GameStats", GameStatsSchema);


