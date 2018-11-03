let games = exports.games = {};
let server = require("./httpserver");
let auth = require("./auth")
let io = undefined;
let database = require("./database")

exports.start = function () {
    console.log("Initializing IO object")
    io = server.io;
    io.on("connection", onConnection)
}

async function onConnection(socket) {
    console.log("[GAME] New socket connection")
    let code = socket.request._query.code;
    let token = socket.request._query.token;
    if (!code || !token) {
        console.log("[ERROR][GAME] Invalid Join Parameters")
        socket.emit("displayError", { "text": "Invalid Parameters" });
        return;
    }
    console.log("[INFO][GAME] Getting user")
    let user = await auth.GetUserFromToken(token);
    console.log("[INFO][GAME] Getting game")
    let game = getGameByCode(code);
    if (!game) {
        console.log("[ERROR][GAME] Invalid Game Code")
        socket.emit("displayError", { "text": "Invalid game code" });
        return;
    }
    console.log("[INFO][GAME] Joining game by code")
    socket.join(code);

    if (game.players.length == 0) {
        console.log("[INFO][GAME] First Game User")
        // We are the first player (the owner of the game)
        socket.on("startgame", function () {
            console.log("[INFO][GAME] Starting game "+game.code)
            game.startGame();
        })
    }
    else{
        socket.on("submitAnswer", function(id){
            game.submitAnswer(user.googleid, id)
        })
    }
    game.join(user.toJSON());
    game.broadcastLobbyStatus();
}

class Game {
    constructor(creator) {
        this.code = generateGameCode();
        this.players = [];
        this.topics = [];
        this.pastQuestions = [];
        this.currentQuestion = undefined;
        console.log("[INFO][GAME] New game "+ this.code)
    }

    startGame() {
        this.sendQuestion();
    }

    getCurrentQuestion(){
        return this.pastQuestions[this.pastQuestions.length - 1]
    }

    getCurrentAnswerByUser(user){
        for(let i = 0; i < this.currentQuestion.userAnswers.length; i++){
            if(this.currentQuestion.userAnswers[i].userid == user){
                return this.currentQuestion.userAnswers[i];
            }
        }
        return undefined;
    }

    submitAnswer(user, answer){
        if(this.getCurrentAnswerByUser(user)){
            throw "User has already submitted an answer"
        }
        console.log(`[GAME][${this.code}] Player ${user} submitted answer ${answer}`)
        this.currentQuestion.userAnswers.push({
            "userid": user,
            "answer": answer,
            "time": 0
        });
        console.log(this.currentQuestion)
        if(this.currentQuestion.userAnswers.length == this.players.length - 1){
            this.showScoreboard()
        }
    }

    showScoreboard(){
        console.log("revealAnswer")
        this.broadcast("revealAnswer", this.currentQuestion)
        setTimeout(() => this.broadcast("scoreboard"), 5000)
    }

    toJSON() {
        return {
            "code": this.code,
            "players": this.players
        }
    }

    join(player) {
        console.log(`[INFO][GAME][${this.code}] New player joined`)
        this.players.push(player)
    }

    broadcastLobbyStatus() {
        console.log(`[INFO][GAME][${this.code}] Updating lobby status`)
        this.broadcast("updateLobbyStatus", { game: this.toJSON() });
    }

    async sendQuestion() {
        console.log(`[INFO][GAME][${this.code}] Sending question`)
        this.currentQuestion = await database.GetRandomQuestion();
        this.currentQuestion.userAnswers = [];
        this.broadcast("showQuestion", this.currentQuestion)
    }

    broadcast(name, data) {
        io.in(this.code).emit(name, data);
    }
}

var generateGameCode = exports.generateGameCode = function () {
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += "1234567890"[Math.floor(Math.random() * 10)];
    }
    return code;
}

function getGameByCode(code) {
    return games[code];
}

var createGame = exports.createGame = function (userid) {
    let game = new Game(userid);
    games[game.code] = game;
    return game.toJSON();
}