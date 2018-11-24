/**
 * HTTP server module
 * @module src/httpserver
 */

var express = require("express");
var app = express();
var webpageurl = __dirname + "/webpage/";
var database = require("./database");
let auth = require("./auth");
let model = require("./models");
let {GameManager} = require("./game");
let classroom = require("./classroom")
let http = require("http").Server(app);
let io = exports.io = require("socket.io")(http);
const nocache = require('nocache');

app.use(nocache());
app.use(express.static('public'));


/**
 * @function
 * @param {Object} req Express request
 * @param {Object} res Express response
 */
app.get("/", function (req, res) {
    console.log("[REQUEST] index.html");
    res.sendFile(webpageurl + "index.html");
});

app.get("/games/user", async function (req, res) {
    let usr = await auth.GetUserFromToken(req.query.id);
    let clasWithGame = [];
    let classes = usr.classes.toObject();
    classes.forEach((clas) => {
        let gam = GameManager.singleton.getGameByCode(clas.id, usr.domain)
        if (gam) {
            let c = clas;
            c.gameInfo = gam.toJSON();
            clasWithGame.push(c);
        }
    })
    res.json({
        classesWithGames: clasWithGame
    })
})

app.get("/users/register", async function (req, res) {
    console.log("[REQUEST] /users/register")
    if (!VerifyParams(req, ["name"])) {
        res.status(402).send("Failed to add user. Invalid parameters");
        return;
    }
    let usr = await database.CreateUser({
        name: req.query.name,
        previousGames: []
    });
    res.json(usr.toJSON());
});

app.post("/users/login", async function (req, res) {
    console.log("[REQUEST] /users/login");
    if (!VerifyParams(req, ["token"])) {
        res.status(402).send("Failed to sign in. Invalid parameters");
    }
    try {
        let user = await auth.GetUserFromToken(req.query.id, req.query.token, true);
        res.json(user);
    } catch (err) {
        console.log(err);
        res.status(403).send(err);
    }
});

app.get("/topics/list", async function (req, res) {
    res.json({})
})

app.get("/classes/list", async function (req, res) {
    classroom.getClasses(req.query.token, true, (body => {
        res.json(body)
    }));
})

app.post("/games/create", async function (req, res) {
    console.log("[REQUEST] /games/create")
    res.json(GameManager.singleton.createGame(req.query.class));
});

/**
 * This makes sure that a request contains the required query parameters
 * @param {Request} req The request to check
 * @param {string[]} params The required parameters
 */
function VerifyParams(req, params) {
    for (let i = 0; i < params.length; i++) {
        if (!req.query[params[i]]) {
            return false;
        }
    }
    return true;
}

exports.start = function (callback) {
    http.listen("8000", function () {
        console.log("Server listening on port 8000");
        callback();
    });
}