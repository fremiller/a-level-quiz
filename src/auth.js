"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const google_auth_library_1 = require("google-auth-library");
const database_1 = require("./database");
let config = require("../quizconfig.json");
let models = require("./models");
const CLIENT_ID = "628238058270-ea37oolom6rtkfhkdulour1ckqe52v3h.apps.googleusercontent.com";
let client = new google_auth_library_1.OAuth2Client();
let classroom = require("./classroom");
function getUserIDFromToken(token) {
    return __awaiter(this, void 0, void 0, function* () {
        let user = yield getUserFromToken(token);
        return user.googleid;
    });
}
exports.getUserIDFromToken = getUserIDFromToken;
function VerifyAdmin(token) {
    return __awaiter(this, void 0, void 0, function* () {
        let ticket = yield client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID
        });
        let payload = ticket.getPayload();
        let userid = payload['sub'];
        if (config.authorizedDomains.indexOf(payload.hd) == -1 && Testers.indexOf(payload.email) == -1) {
            return false;
        }
        return config.admins.indexOf(payload.email) != -1;
    });
}
exports.VerifyAdmin = VerifyAdmin;
var testAccounts = exports.testAccounts = [];
function generateTestAccount(isTeacher) {
    testAccounts.push({
        name: "Test " + testAccounts.length,
        googleid: "TEST_" + testAccounts.length,
        profileImage: "data:image/png;base64,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",
        userType: isTeacher ? models.UserType.TEACHER : models.UserType.STUDENT,
        classes: [{
                name: "Testers Class",
                id: "TEST_CLASS"
            }],
        domain: "orleanspark.school",
        toJSON: function () {
            return {
                name: this.name,
                googleid: this.googleid,
                profileImage: this.profileImage,
                userType: this.userType,
                classes: this.classes,
                domain: this.domain
            };
        }
    });
}
exports.generateTestAccount = generateTestAccount;
function deleteTestAccount(index) {
    testAccounts.splice(index, 1);
}
exports.deleteTestAccount = deleteTestAccount;
function findTestAccount(token) {
    let result = undefined;
    testAccounts.forEach((acc) => {
        if (acc.googleid == token) {
            result = acc;
        }
    });
    return result;
}
exports.findTestAccount = findTestAccount;
const Testers = config.testers;
function getUserFromToken(token, code, isSignIn = false) {
    return __awaiter(this, void 0, void 0, function* () {
        if (token.startsWith("TEST_")) {
            const TA = findTestAccount(token);
            if (TA) {
                return TA;
            }
            else {
                throw "Test account does not exist";
            }
        }
        let ticket = yield client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID
        });
        let payload = ticket.getPayload();
        let userid = payload['sub'];
        if (config.authorizedDomains.indexOf(payload.hd) == -1 && Testers.indexOf(payload.email) == -1) {
            throw "Go away";
        }
        let user = yield database_1.Database.singleton.getUserFromGoogleID(userid);
        if (!user) {
            user = yield database_1.Database.singleton.CreateUser({
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
            }
            else {
                if (payload.email == "fred.miller097@gmail.com") {
                    user.userType = models.UserType.ADMIN;
                }
            }
            user.profileImage = payload.picture;
            let classData = JSON.parse(yield classroom.getClasses(code, user.userType == models.UserType.TEACHER));
            let clasids = [];
            if (classData) {
                if (classData.courses) {
                    classData.courses.forEach((course) => {
                        if (course.courseState != "ARCHIVED") {
                            clasids.push({
                                id: course.id,
                                name: course.name
                            });
                        }
                    });
                }
            }
            user.classes = clasids;
            user.save();
        }
        return user;
    });
}
exports.getUserFromToken = getUserFromToken;
//# sourceMappingURL=auth.js.map