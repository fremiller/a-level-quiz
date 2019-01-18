var mongoose = require("./database").mongoose;

var SchemaNames = [
    "GameStats",
    "Question",
    "User",
    "UserGameStats"
]

var schemas = {
    
}

SchemaNames.forEach((name)=>{
    schemas[name] = require("../models/"+name).Schema
})

/**
 * This function initialises all the models for the database object to use
 */
exports.init = function() {
    console.log("[MODELS] Initialising User Model");
    exports.User = mongoose.model("User", schemas.User);
    console.log("[MODELS] Initialising UserGameStats Model");
    exports.UserGameStats = mongoose.model("UserGameStats", schemas.UserGameStats);
    console.log("[MODELS] Initialising GameStats Model");
    exports.GameStats = mongoose.model("GameStats", schemas.GameStats);
    console.log("[MODELS] Initialising Question model")
    exports.Question = mongoose.model("Questions", schemas.Question);
    exports.UserType = require("../models/UserType").UserType
}