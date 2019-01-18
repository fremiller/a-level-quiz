/**
 * User
 * 
 * @typedef {Object} User
 * @property {string} name The user's real name
 * @property {string} googleid The GoogleId of the user
 * @property {string[]} previousGames The IDs of the previous games that the user has played
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

if(exports){
    exports.Schema = UserSchema
}