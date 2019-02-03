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
const database_1 = require("./database");
/**
 * Represents a class's game
 */
class Game {
    /** Creates a new game object. */
    constructor(classId, options, host, hostSocket) {
        /** Results from past questions. Last item is current question */
        this.questions = [];
        /** The game's current state */
        this.state = "LOBBY";
        /** All players */
        this.players = [];
        console.log("Creating game " + classId);
        this.classid = classId;
        this.host = {
            details: host,
            socket: hostSocket,
            score: 0,
            questionAnswers: []
        };
        this.currentClientScene = Game.FindSceneById("studentlobby");
        this.currentTeacherScene = Game.FindSceneById("teacherlobby");
        this.updateState();
        this.sendScene();
        this.setupSocketEvents(hostSocket, host.googleid, true);
    }
    /** Gets a scene template based on it's id. The IDs are the same as on the client */
    static FindSceneById(id) {
        let scene = undefined;
        Game.Scenes.forEach((sc) => {
            if (sc.sceneId == id) {
                scene = sc;
            }
        });
        return scene;
    }
    /**
     * Sets up the socket events for the user
     * This is the only way data gets into the game instance
     * All these events do not need to be verified, they can only be sent from
     * the user which is stored in the `userid` parameter
     * @param socket Socket to set up event listeners for
     * @param userid The userid of the socket
     * @param isHost Whether the user is the game host
     */
    setupSocketEvents(socket, userid, isHost = false) {
        let gameInstance = this;
        if (isHost) {
            // Move on to the next scene
            socket.on("next", () => gameInstance.next(gameInstance));
            // Reveal answers to all students: displays correct or incorrect scene
            socket.on("revealanswers", () => gameInstance.revealAnswersToStudents(gameInstance));
            // Finish the game
            socket.on("end", () => gameInstance.endGame(gameInstance));
            socket.on("disconnect", () => gameInstance.endGame(gameInstance));
        }
        else {
            socket.on("answer", (ans) => gameInstance.submitAnswer(gameInstance, userid, ans));
        }
    }
    revealAnswersToStudents(gameInstance = this) {
        // PRECONDITION: Game state is in answers or scoreboard
        if (["ANSWERS", "SCOREBOARD"].indexOf(this.state) == -1) {
            return;
        }
        let answerCorrect = new Map();
        gameInstance.questions[gameInstance.questions.length - 1].studentAnswers.forEach((ans) => {
            // Should not find user by ID, this has n time complexity.
            // Add the correct property to an object, and send socket events all at once
            answerCorrect[ans.userid] = ans.correct;
        });
        gameInstance.players.forEach((p) => {
            p.socket.emit("sceneUpdate", {
                scene: answerCorrect[p.details.googleid] ? "correctanswer" : "incorrectanswer",
                data: p.score
            });
        });
    }
    /**
     * Submit an answer on behalf of a user.
     * Assumes socket is authorized to submit answer
     * @param gameInstance The instance of the game
     * @param userid The userid of the user which submitted the answer
     * @param answer The index of the submitted answer
     */
    submitAnswer(gameInstance = this, userid, answer) {
        // PRECONDITION: Must be in game state
        if (gameInstance.state != "GAME") {
            return;
        }
        // Get answers from current question instance
        const answers = gameInstance.questions[gameInstance.questions.length - 1].studentAnswers;
        // Make sure that the user hasn't submitted an answer already
        if (answers.find((a) => { return a.userid == userid; })) {
            console.log("already submitted answer");
            return;
        }
        // Adds a new AnswerData containing answer information to the current question instance
        gameInstance.questions[gameInstance.questions.length - 1].studentAnswers.push({
            answer: answer,
            correct: answer == gameInstance.currentQuestion.correctAnswer,
            time: 0,
            userid: userid
        });
        // Tells the client to display the waiting scene
        const client = gameInstance.findPlayerById(userid);
        client.socket.emit("sceneUpdate", {
            scene: "waitingForAnswers"
        });
        if (answer == gameInstance.currentQuestion.correctAnswer) {
            client.score += 10;
        }
        // Update the teacher scene: the number of answers has changed
        gameInstance.updateState("TEACHER");
        // Checks to see whether all players have submitted an answer
        if (gameInstance.questions[gameInstance.questions.length - 1].studentAnswers.length == gameInstance.players.length) {
            // Move to the next scene; we must already be in the game scene to be in the current function
            gameInstance.next();
        }
    }
    /**
     * Run to get the player to join a game
     * @param user
     * @param socket
     */
    joinGame(user, socket) {
        // Make sure the player is not in the game already
        if (this.findPlayerById(user.googleid)) {
            return;
        }
        // Add the player to the list
        this.players.push({
            score: 0,
            details: user,
            questionAnswers: [],
            socket: socket
        });
        // Update the state
        this.updateState();
        this.setupSocketEvents(socket, user.googleid, false);
    }
    /** Returns information about the game in a JSON friendly format */
    getDetails() {
        return {
            classid: this.classid,
            teacher: this.host.details.name,
            topic: "Physics"
        };
    }
    /** Gets a student by their id.
     *  TODO: Make this a dictionary based so it is order 1.
     *  @param id The player's googleid
     */
    findPlayerById(id) {
        return this.players.find((p) => { return p.details.googleid == id; });
    }
    /**
     * Sends the current scene as-is to the clients
     * @param options Which clients to send the scene to
     */
    sendScene(options = "BOTH") {
        console.log(`Sending teacher ${this.currentTeacherScene.sceneId}
Sending players ${this.currentClientScene.sceneId}`);
        if (options == "TEACHER" || options == "BOTH") {
            this.host.socket.emit("sceneUpdate", {
                scene: this.currentTeacherScene.sceneId,
                data: this.currentTeacherScene.data
            });
        }
        if (options == "STUDENT" || options == "BOTH") {
            this.players.forEach((p) => {
                p.socket.emit("sceneUpdate", {
                    scene: this.currentClientScene.sceneId,
                    data: this.currentClientScene.data
                });
            });
        }
    }
    /**
     * Ends the game
     * @param gameInstance Current game instance
     */
    endGame(gameInstance = this) {
        console.log("End Game");
    }
    /**
     * Finds and displays the next question
     * @param gameInstance Current game instance
     */
    nextQuestion(gameInstance = this) {
        return __awaiter(this, void 0, void 0, function* () {
            let question = yield database_1.Database.singleton.GetRandomQuestion();
            this.currentQuestion = question;
            this.questions.push({
                questionId: this.currentQuestion._id,
                questionNumber: this.questions.length,
                studentAnswers: []
            });
            let CScene = {
                answers: this.currentQuestion.answers,
                timeLimit: this.currentQuestion.timeLimit
            };
            let TScene = {
                question: this.currentQuestion.question,
                answerCounts: [],
                answers: this.currentQuestion.answers,
                correctAnswer: -1,
                revealAnswers: false,
                studentAnswerCount: 0,
                timeLimit: this.currentQuestion.timeLimit,
                number: this.questions.length
            };
            this.currentClientScene = Game.FindSceneById("studentquestion");
            this.currentClientScene.data = CScene;
            this.currentTeacherScene = Game.FindSceneById("teacherquestion");
            this.currentTeacherScene.data = TScene;
            this.updateState();
        });
    }
    /**
     * Runs each current scene's update function then sends the new data to all clients
     * @param options The clients to update
     */
    updateState(options = "BOTH") {
        if (this.currentClientScene.update) {
            this.currentClientScene.data = this.currentClientScene.update(this, this.currentClientScene.data);
        }
        if (this.currentTeacherScene.update) {
            this.currentTeacherScene.data = this.currentTeacherScene.update(this, this.currentTeacherScene.data);
        }
        this.sendScene(options);
    }
    /**
     * Gets the current scene
     * @param isTeacher Gets the teacher scene if true
     */
    getCurrentScene(isTeacher) {
        if (isTeacher) {
            return this.currentTeacherScene;
        }
        else {
            return this.currentClientScene;
        }
    }
    /**
     * Goes to the next stage of the game
     * @param gameInstance The current game instance
     */
    next(gameInstance = this) {
        if (gameInstance.state == "LOBBY" || gameInstance.state == "SCOREBOARD") {
            // Move to the next question
            gameInstance.state = "GAME";
            console.log("Getting next question");
            gameInstance.nextQuestion(gameInstance);
            return;
        }
        else if (gameInstance.state == "GAME") {
            // Reveal answers
            gameInstance.state = "ANSWERS";
            console.log("Revealing answers");
            this.updateState("TEACHER");
            return;
        }
        else if (gameInstance.state == "ANSWERS") {
            // Move to the scoreboard
            gameInstance.state = "SCOREBOARD";
            console.log("Moving to scoreboard");
            return;
        }
    }
}
/** Templates for all scenes. */
Game.Scenes = [
    {
        teacher: true,
        sceneId: "teacherlobby",
        data: {},
        update: (game, data) => {
            data.players = [];
            game.players.forEach((p) => {
                data.players.push(p.details.name);
            });
            return data;
        }
    },
    {
        teacher: false,
        sceneId: "studentlobby"
    },
    {
        teacher: false,
        sceneId: "studentquestion",
        data: {}
    },
    {
        teacher: false,
        sceneId: "correctanswer"
    },
    {
        teacher: false,
        sceneId: "incorrectanswer"
    },
    {
        teacher: true,
        sceneId: "teacherquestion",
        data: {},
        update: (game, data) => {
            // Update the state to match how many answers the game now has
            data.studentAnswerCount = game.questions[game.questions.length - 1].studentAnswers.length;
            // If the game state is answers, we only need to calculate this state once
            if (game.state == "ANSWERS" && !data.revealAnswers) {
                // Reveal answers
                data.revealAnswers = true;
                // Add the question's correct answer to the data
                data.correctAnswer = game.currentQuestion.correctAnswer;
                // Add all the answer counts
                data.answerCounts = [0, 0, 0, 0];
                game.questions[game.questions.length - 1].studentAnswers.forEach((answer) => {
                    if (answer.answer > -1 && answer.answer <= 3) {
                        data.answerCounts[answer.answer] += 1;
                    }
                });
            }
            return data;
        }
    },
    {
        teacher: false,
        sceneId: "waitingForAnswers"
    },
    {
        teacher: false,
        sceneId: "correctanswer"
    },
    {
        teacher: false,
        sceneId: "incorrectanswer"
    },
    {
        teacher: true,
        sceneId: "scoreboard"
    }
];
exports.Game = Game;
//# sourceMappingURL=game.js.map