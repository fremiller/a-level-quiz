var mongoose = exports.mongoose = require("mongoose");
var models = exports.models = require("./models");
const {
    exec
} = require('child_process');
var initTried = false;

exports.init = init = function (callback) {
    models.init();
    console.log("\tConnecting")
    mongoose.connect("mongodb://localhost:27017/quiztest", {
        useNewUrlParser: true
    });
    var db = mongoose.connection;
    if (!initTried) {
        db.once('open', function () {
            console.log("\r\tConnected");
            callback();
        });
    }
    db.on('error', function () {
        if (initTried) {
            throw "Failed to connect to database"
        } else {
            console.log("Unable to connect to database. Attempting to start");
            initTried = true;
            exec("service mongod start", (err, stdout, stderr) => {
                if (err) {
                    if (err.message.includes("Access denied")) {
                        throw "Unable to start service. Run this server as root or start mongo service manually"
                    } else {
                        throw "Unable to start service:\n" + err.message
                    }
                }
                setTimeout(init, 1000, callback);
            })
        }
    });

}

exports.getUserFromGoogleID = async function (id) {
    let model = await models.User.find().where("googleid").equals(id).exec();
    if (model.length == 0) {
        return undefined;
    }
    return model[0];
}

exports.CreateUser = async function (userObj) {
    let usr = new models.User(userObj);
    usr = await usr.save();
    return usr;
}

exports.GetRandomQuestion = async function () {
    return {
        question: "Which of these statements are correct?",
        description: "1) a\n2) b\n3) c",
        answers: [
            "1 is correct",
            "1 and 2 are correct",
            "1 2 and 3 are correct",
            "None are correct"
        ],
        correctAnswer: 3,
        timeLimit: 60,
    }
}