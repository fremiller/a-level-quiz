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
    classId: String,
    timestamp: String,
    position: Number,
    userId: String,
    questions: [Number]
}

if(exports){
    exports.Schema = UserGameStatsSchema
}