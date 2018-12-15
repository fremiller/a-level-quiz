const {
    OAuth2Client
} = require('google-auth-library');
let {Database} = require("./database");
let config = require("../quizconfig.json");
let models = require("./models")
const CLIENT_ID = "628238058270-ea37oolom6rtkfhkdulour1ckqe52v3h.apps.googleusercontent.com";
let client = new OAuth2Client();
let classroom = require("./classroom")

exports.getUserIDFromToken = exports.GetUserIDFromToken = async function (token) {
    let user = await getUserFromToken(token);
    return user.googleid;
}

const Testers = config.testers;

const getUserFromToken = exports.GetUserFromToken = async function (token, code, isSignIn) {
    let ticket = await client.verifyIdToken({
        idToken: token,
        audience: CLIENT_ID
    })
    let payload = ticket.getPayload();
    let userid = payload['sub'];
    if (config.authorizedDomains.indexOf(payload.hd) == -1 && Testers.indexOf(payload.email) == -1){
        throw "Go away"
    }

    let user = await Database.singleton.getUserFromGoogleID(userid);
    if (!user) {
        user = await Database.singleton.CreateUser({
            "name": payload.name,
            "domain": payload.hd,
            "googleid": payload.sub,
            "profileImage": payload.picture,
            "userType": models.UserType.STUDENT,
        });
    }
    if (isSignIn) {
        if (user.domain == "orleanspark.school") {
            user.userType = payload.email.match(/^[0-9]{2}.+/) ? models.UserType.STUDENT : models.UserType.TEACHER;
        } else {
            if (payload.email == "fred.miller097@gmail.com") {
                user.userType = models.UserType.TEACHER;
            }
        }
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