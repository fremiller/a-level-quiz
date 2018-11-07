const {
    OAuth2Client
} = require('google-auth-library');
let db = require("./database");
let models = require("./models")
const CLIENT_ID = "628238058270-ea37oolom6rtkfhkdulour1ckqe52v3h.apps.googleusercontent.com";
let client = new OAuth2Client();
let classroom = require("./classroom")

exports.getUserIDFromToken = exports.GetUserIDFromToken = async function (token) {
    let user = await getUserFromToken(token);
    return user._id;
}

const getUserFromToken = exports.GetUserFromToken = async function (token, code, isSignIn) {
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
    if (!user) {
        user = await db.CreateUser({
            "name": payload.name,
            "domain": payload.hd,
            "googleid": payload.sub,
            "profileImage": payload.picture,
            "userType": models.UserType.STUDENT,
        });
    }
    if (isSignIn) {
        user.userType = payload.email.startsWith("12") ? models.UserType.STUDENT : models.UserType.TEACHER;
        user.profileImage = payload.picture;
        let classData = JSON.parse(await classroom.getClasses(code, user.userType == models.UserType.TEACHER))
        let clasids = [];
        classData.courses.forEach((course) => {
            if (course.courseState != "ARCHIVED") {
                clasids.push({
                    id: course.id,
                    name: course.name
                })
            }
        })
        user.classes = clasids;
        user.save();
    }
    return user
}