var mongoose = exports.mongoose = require("mongoose");
var models = exports.models = require("./models")

exports.init = function (callback) {
    console.log("\tConnecting")
    mongoose.connect("mongodb://localhost:27017/quiztest", {
        useNewUrlParser: true
    }); 
    var db = mongoose.connection;
    db.on('error', function () {
        console.error.bind(console, 'connection error:');
        return;
    });
    db.once('open', function () {
        console.log("\r\tConnected");
        callback();
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

exports.GetRandomQuestion = async function (){
    return {
        question: "Test question one",
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