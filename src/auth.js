const {OAuth2Client} = require('google-auth-library');
let db = require("./database");
let models = require("./models")
const CLIENT_ID = "628238058270-ea37oolom6rtkfhkdulour1ckqe52v3h.apps.googleusercontent.com";
let client = new OAuth2Client();

exports.getUserIDFromToken = exports.GetUserIDFromToken = async function(token){
    let user = await getUserFromToken(token);
    return user._id;
}

const getUserFromToken = exports.GetUserFromToken = async function(token){
    let ticket = await client.verifyIdToken({
        idToken: token,
        audience: CLIENT_ID
    })
    let payload = ticket.getPayload();
    let userid = payload['sub'];
    // if (payload.hd != "orleanspark.school"){
    //     throw "You can't sign up for this"
    // }
    let user = await db.getUserFromGoogleID(userid);
    if(!user){
        user = await db.CreateUser({
            "name": payload.name,
            "domain": payload.hd,
            "googleid": payload.sub,
            "profileImage": payload.picture,
            "userType": models.UserType.STUDENT,
        });
    }
    user.userType = payload.email.startsWith("12") ? models.UserType.STUDENT : models.UserType.TEACHER;
    user.profileImage = payload.picture;

    user.save();
    return user
}