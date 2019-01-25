import { IQuestion, IQuestionDocument, IUser } from "./models";
import { Document } from "mongoose";
import {GameManager} from "./gamemanager";
import {Database} from "./database";
import { ClassInfo } from "./classroom";

/**
 * Game module
 * @module src/game
 */

 interface GameOptions{

 }

 interface AnswerData{
     answer: number
     correct: boolean
     userid?: string
    time: number
 }

 interface GamePlayer{
     score: number
     socket: SocketIO.Socket
     questionAnswers: AnswerData[]
     details: IUser
 }

 interface QuestionResults{
    questionId: string
    questionNumber: number
    studentAnswers: AnswerData[]
 }

 interface GameScene{
     sceneId: string
     teacher: boolean
     data?: any
     update?: CallableFunction
 }

 interface LobbyData{}

 interface TeacherQuestionData extends LobbyData{
    question: string,
    answers: string[],
    studentAnswerCount: number,
    timeLimit: number,
    correctAnswer: number,
    answerCounts: number[],
    revealAnswers: boolean
 }

 interface TeacherLobbyData extends LobbyData{
    players: string[]
 }

 interface StudentQuestionData extends LobbyData{
     answers: string[]
     timeLimit: number
 }

 interface IDDocument{
     _id: string;
 }

 interface GameDetails{
     classid: string,
     teacher: string,
     topic: string
 }

 interface Question extends IQuestion, IDDocument{}


/**
 * Represents a class's game
 */
export class Game {
    classid: string;
    currentClientScene: GameScene;
    currentTeacherScene: GameScene;
    questions: QuestionResults[] = [];
    currentQuestion: Question;
    state: "LOBBY"|"GAME"|"SCOREBOARD" = "LOBBY";
    players: GamePlayer[] = [];
    host: GamePlayer;

    static Scenes: GameScene[] = [
        {
            teacher: true,
            sceneId: "teacherlobby",
            data: {},
            update: (game: Game, data: TeacherLobbyData): TeacherLobbyData=>{
                data.players = [];
                game.players.forEach((p)=>{
                    data.players.push(p.details.name);
                })
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
            update: (game: Game, data: TeacherQuestionData): TeacherQuestionData=>{
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
    ]

    static FindSceneById(id: string): GameScene{
        let scene = undefined;
        Game.Scenes.forEach((sc)=>{
            if(sc.sceneId == id){
                scene = sc;
            }
        })
        return scene;
    }

    constructor(classId: string, options: GameOptions, host: IUser, hostSocket: SocketIO.Socket){
        console.log("Creating game "+classId)
        this.classid = classId;
        this.host = {
            details: host,
            socket: hostSocket,
            score: 0,
            questionAnswers: []
        }
        this.currentClientScene = Game.FindSceneById("studentlobby");
        this.currentTeacherScene = Game.FindSceneById("teacherlobby");
        this.updateState()
        this.sendScene()
    }

    /**
     * Run to get the player to join a game
     * @param user 
     * @param socket 
     */
    joinGame(user: IUser, socket: SocketIO.Socket){
        // Make sure the player is not in the game already
        if(this.findPlayerById(user.googleid)){
            return
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

    getDetails(): GameDetails{
        return {
            classid: this.classid,
            teacher: this.host.details.name,
            topic: "Physics"
        }
    }

    findPlayerById(id:string): GamePlayer|undefined{
        this.players.forEach((p)=>{
            if(p.details.googleid == id){
                return p;
            }
        })
        return
    }

    sendScene(){
        console.log(`Sending teacher ${this.currentTeacherScene.sceneId}
Sending players ${this.currentClientScene.sceneId}`)
        this.host.socket.emit("sceneUpdate", {
            scene: this.currentTeacherScene.sceneId,
            data: this.currentTeacherScene.data
        })
        this.players.forEach((p)=>{
            p.socket.emit("sceneUpdate", {
                scene: this.currentClientScene.sceneId,
                data: this.currentClientScene.data
            })
        })
    }

    startGame(){
        this.state = "GAME";
    }

    endGame(){

    }

    async nextQuestion(){
        let question = await Database.singleton.GetRandomQuestion();
        this.currentQuestion = question;
        this.questions.push({
            questionId: this.currentQuestion._id,
            questionNumber: this.questions.length,
            studentAnswers: []
        })
        let CScene: StudentQuestionData = {
            answers: this.currentQuestion.answers,
            timeLimit: this.currentQuestion.timeLimit
        }
        let TScene: TeacherQuestionData = {
            question: this.currentQuestion.question,
            answerCounts: [],
            answers: this.currentQuestion.answers,
            correctAnswer: -1,
            revealAnswers: false,
            studentAnswerCount: 0,
            timeLimit: this.currentQuestion.timeLimit
        }
        this.currentClientScene = Game.FindSceneById("studentquestion");
        this.currentClientScene.data = CScene;
        this.currentTeacherScene = Game.FindSceneById("teacherquestion")
        this.currentTeacherScene.data = TScene;
    }

    updateState(){
        if(this.currentClientScene.update){
            this.currentClientScene.data = this.currentClientScene.update(this, this.currentClientScene.data)
        }
        if(this.currentTeacherScene.update){
            this.currentTeacherScene.data = this.currentTeacherScene.update(this, this.currentTeacherScene.data)
        }
        this.sendScene()
    }
    
    getState(isTeacher: boolean): GameScene{
        if(isTeacher){
            return this.currentTeacherScene;
        }
        else{
            return this.currentClientScene;
        }
    }

    next(){

    }

}
