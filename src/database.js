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
        question: "The temperature of a fixed volume of an ideal gas is raised from 300K to 330K.\nWhich of the following statements about the gas is/are true?",
        description: "1) The mean energy of the particles of the gas increases by 10% \n 2) The mean square velocity of the particles increases by 10% \n 3) The number of collisions per second with the walls of the container increases by 10%",
        answers: [
            "1, 2 and 3 are correct",
            "Only 1 and 2 are correct",
            "Only 2 and 3 are correct",
            "Only 1 is correct"
        ],
        correctAnswer: 1,
        timeLimit: 60
    },
    {
        question: "If a gang pull up, are you gonna back your bredrin?",
        description: "",
        answers: [
            "Yes",
            "No",
            "On",
            "yop"
        ],
        correctAnswer: 3
    },
    {
        question: "Would you rather...",
        description: "",
        answers: [
            "Victory Royale",
            "Friends",
            "Money",
            "Minecraft"
        ],
        correctAnswer: 3
    },
    {
        question: "What is luke's waifu",
        description: "",
        answers: [
            "Karim",
            "Femscout",
            "Andrew",
            "The guide from terraria"
        ],
        correctAnswer: 3
    }
]

exports.GetRandomQuestion = async function () {
    return questions[Math.floor(Math.random() * questions.length)]
}