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
    constructor(classId, options, host, hostSocket) {
        this.questions = [];
        this.state = "LOBBY";
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
    }
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
        this.updateState();
        this.sendScene();
    }
    getDetails() {
        return {
            classid: this.classid,
            teacher: this.host.details.name,
            topic: "Physics"
        };
    }
    findPlayerById(id) {
        this.players.forEach((p) => {
            if (p.details.googleid == id) {
                return p;
            }
        });
        return;
    }
    sendScene() {
        console.log(`Sending teacher ${this.currentTeacherScene.sceneId}
Sending players ${this.currentClientScene.sceneId}`);
        this.host.socket.emit("sceneUpdate", {
            scene: this.currentTeacherScene.sceneId,
            data: this.currentTeacherScene.data
        });
        this.players.forEach((p) => {
            p.socket.emit("sceneUpdate", {
                scene: this.currentClientScene.sceneId,
                data: this.currentClientScene.data
            });
        });
    }
    startGame() {
        this.state = "GAME";
    }
    endGame() {
    }
    nextQuestion() {
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
                timeLimit: this.currentQuestion.timeLimit
            };
            this.currentClientScene = Game.FindSceneById("studentquestion");
            this.currentClientScene.data = CScene;
            this.currentTeacherScene = Game.FindSceneById("teacherquestion");
            this.currentTeacherScene.data = TScene;
        });
    }
    updateState() {
        if (this.currentClientScene.update) {
            this.currentClientScene.data = this.currentClientScene.update(this, this.currentClientScene.data);
        }
        if (this.currentTeacherScene.update) {
            this.currentTeacherScene.data = this.currentTeacherScene.update(this, this.currentTeacherScene.data);
        }
        this.sendScene();
    }
    getState(isTeacher) {
        if (isTeacher) {
            return this.currentTeacherScene;
        }
        else {
            return this.currentClientScene;
        }
    }
    next() {
    }
}
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
        teacher: true,
        sceneId: "teacherquestion",
        data: {},
        update: (game, data) => {
            data.studentAnswerCount = game.questions[game.questions.length - 1].studentAnswers.length;
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