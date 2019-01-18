/**
 * 
 * This is a structure stored by itself. It stores the IDs of all the players
 * in the game which can be used to find statistics about each player.
 * 
 * @typedef {Object} GameStats
 * @property {string} gameId The ID of the game
 * @property {string[]} players A list of player IDs which can be used to find players
 * @property {string} timeStamp The time that the game finished
 */
var GameStatsSchema = {
    classId: String,
    timestamp: String,
    players: [String],
    questions: [String]
}

if(exports){
    exports.Schema = GameStatsSchema;
}