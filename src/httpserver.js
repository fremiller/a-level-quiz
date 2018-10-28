var express = require("express");
var app = express();
var webpageurl = __dirname + "/webpage/";
var database = require("./database");
let auth = require("./auth");
let model = require("./models");
let game = require("./game");
let http = require("http").Server(app);
let io = exports.io = require("socket.io")(http);

app.use(express.static('public'))

app.get("/", function (req, res) {
    console.log("[REQUEST] index.html")
    res.sendFile(webpageurl + "index.html");
});

app.get("/users/register", async function (req, res) {
    console.log("[REQUEST] /users/register")
    if (!VerifyParams(req, ["name"])) {
        res.status(402).send("Failed to add user. Invalid parameters");
        return;
    }
    let usr = await database.CreateUser({ name: req.query.name, previousGames: [] });
    res.json(usr.toJSON());
});

app.post("/users/login", async function (req, res) {
    console.log("[REQUEST] /users/login")
    if (!VerifyParams(req, ["token"])) {
        res.status(402).send("Failed to sign in. Invalid parameters")
    }
    try {
        let user = await auth.GetUserFromToken(req.query.token);
        res.json(user);
    }
    catch (err) {
        res.status(403).send(err);
    }
});

app.post("/games/create", async function(req, res){
    console.log("[REQUEST] /games/create")
    res.json(game.createGame());
})

/**
 * This makes sure that a request contains the required query parameters
 * @param {Request} req The request to check
 * @param {[String]} params The required parameters
 */
function VerifyParams(req, params) {
    for (let i = 0; i < params.length; i++) {
        if (!req.query[params[i]]) {
            return false
        }
        return true
    }
}

exports.start = function (callback) {
    http.listen("8000");
    callback();
}
