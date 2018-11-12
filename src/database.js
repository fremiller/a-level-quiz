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

const questions = [
    {
        "question": "One million electrons travel between two points in a circuit.\nThe total energy gained by the electrons is 1.6x10<sup>-10</sup>J.\n\nWhat is the potential difference between the two points?",
        "type": "EXAM",
        "answers": [
            "1.6x10<sup>-16</sup>V",
            "1.6x10<sup>-4</sup>V",
            "1.0x10<sup>3</sup>V",
            "1.0x10<sup>9</sup>V"
        ],
        "correctAnswer": 2,
        "timeLimit": 60,
        "exam": "H556/02 June 2017 Question 2"
    }
]

exports.GetRandomQuestion = async function () {
    return questions[Math.floor(Math.random() * questions.length)]
}