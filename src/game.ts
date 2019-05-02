/**
 * @module a-level-quiz
 * @internal
 */

import { IQuestion, IQuestionDocument, IUser, IUserGameStatsDocument } from "./models";
import { GameManager } from "./gamemanager";
import { Database } from "./database";

/**
 * Represents options for a game
 * Could be used in the future
 */
interface GameOptions {

}

/**
 * Represents a users answer for a question
 */
interface AnswerData {
    answer: number
    correct: boolean
    userid?: string
    time: number
}

/**
 * Represents a player in the game
 */
interface GamePlayer {
    score: number
    socket: SocketIO.Socket
    questionAnswers: AnswerData[]
    details: IUser
    displayName: string
}

/**
 * Represents a scoreboard entry
 */
interface ScoreboardData {
    score: number
    name: string
}

/**
 * Represents data about a question instance
 */
interface QuestionResults {
    questionId: string
    questionNumber: number
    studentAnswers: AnswerData[]
}

/**
 * Represents a client side scene
 */
interface GameScene {
    sceneId: string
    teacher: boolean
    data?: any
    update?: any
}

interface LobbyData { }

/**
 * Represents data in the teacherquestion scene
 */
interface TeacherQuestionData extends LobbyData {
    question: string,
    answers: string[],
    studentAnswerCount: number,
    timeLimit: number,
    correctAnswer: number,
    answerCounts: number[],
    revealAnswers: boolean,
    number: number
    endTime: number
}

/**
 * Represents data in the teacherlobby scene
 */
interface TeacherLobbyData extends LobbyData {
    players: string[]
}

/**
 * Represents data in the studentquestion scene
 */
interface StudentQuestionData extends LobbyData {
    answers: string[]
    timeLimit: number
    endTime: number
    number: number
}

/**
 * Represents data in the summary scene
 */
interface SummaryData extends LobbyData {
    leaderboard: ScoreboardData[],
    numberOfQuestions: number
}

/**
 * Adds the ID parameter which is present in database objects
 */
interface IDDocument {
    _id: string;
}

/**
 * Represents basic game information
 */
interface GameDetails {
    classid: string,
    teacher: string,
    topic: string
}

/**
 * Represents what the client expects to happen
 * when the next function is called
 */
interface NextData {
    expectedQuestion: number,
    expectedState: string
}

/**
 * Question with ID
 */
interface Question extends IQuestion, IDDocument { }


/**
 * Represents a class's game
 * @internal
 */
export class Game {
    /** The game's class ID. PK */
    classid: string;
    /** The current scene with state displayed on the host */
    currentClientScene: GameScene;
    /** The current scene with state displayed on the clients */
    currentTeacherScene: GameScene;
    /** Results from past questions. Last item is current question */
    questions: QuestionResults[] = [];
    /** Current question data. Identical to data in the question database */
    currentQuestion: Question;
    /** The game's current state */
    state: "LOBBY" | "GAME" | "SCOREBOARD" | "ANSWERS" = "LOBBY";
    /** All players */
    players: GamePlayer[] = [];
    /** Host */
    host: GamePlayer;
    /** The timer for the question to continue */
    questionTimer: NodeJS.Timer
    /** The time that the last question started */
    currentQuestionStartTime: number

    /** Templates for all scenes. */
    static Scenes: GameScene[] = [
        {
            teacher: true,
            sceneId: "teacherlobby",
            data: {},
            update: (game: Game, data: TeacherLobbyData): TeacherLobbyData => {
                data.players = [];
                game.players.forEach((p) => {
                    if (p.socket.connected) {
                        data.players.push(p.displayName);
                    }
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
            update: (game: Game, data: TeacherQuestionData): TeacherQuestionData => {
                // Update the state to match how many answers the game now has
                data.studentAnswerCount = game.questions[game.questions.length - 1].studentAnswers.length;
                // If the game state is answers, we only need to calculate this state once
                if (game.state == "ANSWERS" && !data.revealAnswers) {
                    // Reveal answers
                    data.revealAnswers = true;
                    // Add the question's correct answer to the data
                    data.correctAnswer = game.currentQuestion.correctAnswer;
                    // Add all the answer counts
                    data.answerCounts = [0, 0, 0, 0]
                    game.questions[game.questions.length - 1].studentAnswers.forEach((answer) => {
                        if (answer.answer > -1 && answer.answer <= 3) {
                            data.answerCounts[answer.answer] += 1
                        }
                    })
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
        },
        {
            teacher: false,
            sceneId: "studentdashboard"
        },
        {
            teacher: true,
            sceneId: "teacherdashboard"
        },
        {
            teacher: true,
            sceneId: "teachersummary",
            data: {},
            update: (game: Game, data: SummaryData): SummaryData => {
                data.leaderboard = game.players.map((player) => {
                    return {
                        name: player.displayName,
                        score: player.score
                    }
                })
                data.numberOfQuestions = game.questions.length
                return data
            }
        }
    ]

    /** Gets a scene template based on it's id. The IDs are the same as on the client */
    static FindSceneById(id: string): GameScene {
        let scene = undefined;
        Game.Scenes.forEach((sc) => {
            if (sc.sceneId == id) {
                scene = sc;
            }
        })
        return scene;
    }

    /** Creates a new game object. */
    constructor(classId: string, options: GameOptions, host: IUser, hostSocket: SocketIO.Socket) {
        console.log("Creating game " + classId)
        // Set the class id to the given ID
        this.classid = classId;
        // Set the host to the given host
        this.host = {
            details: host,
            socket: hostSocket,
            score: 0,
            questionAnswers: [],
            displayName: ""
        }
        // Set the default scenes
        this.currentClientScene = Game.FindSceneById("studentlobby");
        this.currentTeacherScene = Game.FindSceneById("teacherlobby");
        // Update and send the scenes to the clients
        this.updateState()
        this.sendScene()
        // Setup the host's socket events
        this.setupSocketEvents(hostSocket, host.googleid, true)
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
    setupSocketEvents(socket: SocketIO.Socket, userid: string, isHost: boolean = false) {
        let gameInstance = this;
        if (isHost) {
            // Move on to the next scene
            socket.on("next", (data: NextData) => gameInstance.next(gameInstance, data))
            // Reveal answers to all students: displays correct or incorrect scene
            socket.on("revealanswers", () => gameInstance.revealAnswersToStudents(gameInstance))
            // Finish the game
            socket.on("end", () => gameInstance.endGame(gameInstance))
        }
        else {
            // Question answered
            socket.on("answer", (ans) => gameInstance.submitAnswer(gameInstance, userid, ans))
        }
        // Runs when a socket disconnects
        socket.on("disconnect", () => {
            if (gameInstance.state == "LOBBY") {
                this.updateState()
            }
            console.log("disconnected")
        })
    }

    /**
     * Reveals answers to students
     * @param gameInstance The game instance to run this function on
     */
    revealAnswersToStudents(gameInstance: Game = this) {
        console.log("Reveal Answers")
        // PRECONDITION: Game state is in answers or scoreboard
        if (["ANSWERS", "SCOREBOARD"].indexOf(this.state) == -1) {
            return
        }
        let answerCorrect: Map<String, Boolean> = new Map<String, Boolean>();
        gameInstance.questions[gameInstance.questions.length - 1].studentAnswers.forEach((ans) => {
            // Should not find user by ID, this has n time complexity.
            // Add the correct property to an object, and send socket events all at once
            answerCorrect[ans.userid] = ans.correct;
        })
        // Update each player client with correct or incorrect answer
        gameInstance.players.forEach((p) => {
            p.socket.emit("sceneUpdate", {
                scene: answerCorrect[p.details.googleid] ? "correctanswer" : "incorrectanswer",
                data: p.score
            })
        })
    }

    /**
     * Submit an answer on behalf of a user.
     * Assumes socket is authorized to submit answer
     * @param gameInstance The instance of the game
     * @param userid The userid of the user which submitted the answer
     * @param answer The index of the submitted answer
     */
    submitAnswer(gameInstance: Game = this, userid: string, answer: number) {
        console.log("submit answer")
        // PRECONDITION: Must be in game state
        if (gameInstance.state != "GAME") {
            return
        }
        // Get answers from current question instance
        const answers = gameInstance.questions[gameInstance.questions.length - 1].studentAnswers;
        // Make sure that the user hasn't submitted an answer already
        if (answers.find((a) => { return a.userid == userid })) {
            console.log("already submitted answer")
            return;
        }
        const correct = answer == gameInstance.currentQuestion.correctAnswer
        // Adds a new AnswerData containing answer information to the current question instance
        gameInstance.questions[gameInstance.questions.length - 1].studentAnswers.push({
            answer: answer,
            correct: correct,
            time: 0,
            userid: userid
        })
        // Tells the client to display the waiting scene
        const client = gameInstance.findPlayerById(userid);
        client.socket.emit("sceneUpdate", {
            scene: "waitingForAnswers"
        })
        if (correct) {
            client.score += this.calculateBonusPoints();
        }
        client.questionAnswers.push({
            answer: answer,
            correct: correct,
            time: 0
        })
        // Update the teacher scene: the number of answers has changed
        gameInstance.updateState("TEACHER")
        // Checks to see whether all players have submitted an answer
        if (gameInstance.questions[gameInstance.questions.length - 1].studentAnswers.length == gameInstance.players.length) {
            // Move to the next scene; we must already be in the game scene to be in the current function
            gameInstance.next(gameInstance, {
                expectedState: "GAME",
                expectedQuestion: this.questions.length - 1
            })
        }
    }

    /**
     * Calculates the amount of points to award to the user based on the time taken
     * There is an estimate of this on the client
     */
    calculateBonusPoints() {
        // Calculate how much time has passed since the game has started
        let timeElapsed = (new Date().getTime() - this.currentQuestionStartTime) / 1000;
        // Points decrease linearly with time
        return Math.round(100 - ((100 / this.currentQuestion.timeLimit) * timeElapsed))
    }

    /**
     * Makes a player leave the game based on their ID
     * @param userid The userid to leave
     */
    leaveGame(userid: string) {
        // Find the player
        let player = this.findPlayerById(userid);
        // Disconnect the player
        player.socket.disconnect();
    }

    /**
     * Run to get the player to join a game
     * @param user 
     * @param socket 
     */
    joinGame(user: IUser, socket: SocketIO.Socket) {
        // Make sure the player is not in the game already
        let p = this.findPlayerById(user.googleid);
        if (p) {
            if (p.socket.disconnected) {
                // The socket is trying to reconnect
                p.socket = socket
                this.setupSocketEvents(socket, user.googleid, false)
                if (this.state == "LOBBY") {
                    this.updateState()
                    return
                }
                // If we are in a game and the user has submitted an answer
                if (this.questions.length > 0) {
                    if ((this.state == "GAME" || this.state == "ANSWERS") && this.questions[this.questions.length - 1].studentAnswers.find((p) => { return p.userid == user.googleid })) {
                        p.socket.emit("sceneUpdate", {
                            scene: "waitingForAnswers"
                        })
                        return
                    }
                }
                p.socket.emit("sceneUpdate", {
                    scene: this.currentClientScene.sceneId,
                    data: this.currentClientScene.data
                })
                return
            } else {
                // There is already a player in the lobby
                return
            }
        }
        else {
            // The player hasn't connected before
            // Generate the display name based on other's names and surnames
            let displayName = user.name.split(" ")[0] + " "
            this.players.forEach((p) => {
                while (p.displayName == displayName) {
                    p.displayName += p.details.name.replace(p.displayName, "")[0]
                    displayName += user.name.replace(displayName, "")[0]
                }
            })
            // Add the player to the list
            this.players.push({
                score: 0,
                details: user,
                questionAnswers: [],
                socket: socket,
                displayName: displayName
            });

            // Update the state
            if (this.state != "GAME") {
                this.updateState();
            }
            // Setup the player's socket events
            this.setupSocketEvents(socket, user.googleid, false)
        }
    }

    /** Returns information about the game in a JSON friendly format */
    getDetails(): GameDetails {
        return {
            classid: this.classid,
            teacher: this.host.details.name,
            topic: "Physics"
        }
    }

    /** Gets a student by their id.
     *  TODO: Make this a dictionary based so it is order 1.
     *  @param id The player's googleid
     */
    findPlayerById(id: string): GamePlayer | undefined {
        return this.players.find((p) => { return p.details.googleid == id });
    }

    /**
     * Sends the current scene as-is to the clients
     * @param options Which clients to send the scene to
     */
    sendScene(options: "TEACHER" | "STUDENT" | "BOTH" | "NONE" = "BOTH") {
        console.log(`Sending teacher ${this.currentTeacherScene.sceneId}
Sending players ${this.currentClientScene.sceneId}`)
        let time = new Date().getTime();
        let teacherData: any = this.currentTeacherScene.data;
        if (teacherData) {
            teacherData.time = time;
        }
        if (options == "TEACHER" || options == "BOTH") {
            this.host.socket.emit("sceneUpdate", {
                scene: this.currentTeacherScene.sceneId,
                data: teacherData,
                state: this.state
            })
        }
        let studentData: any = this.currentClientScene.data;
        if (studentData) {
            studentData.time = time;
        }
        if (options == "STUDENT" || options == "BOTH") {
            this.players.forEach((player) => {
                player.socket.emit("sceneUpdate", {
                    scene: this.currentClientScene.sceneId,
                    data: studentData,
                    state: this.state,
                })
            })
        }
    }

    /**
     * Ends the game
     * @param gameInstance Current game instance
     */
    async endGame(gameInstance: Game = this) {
        console.log("End Game")
        // Set the teacher and client scenes to a loading scene
        // while data is being processed
        gameInstance.currentClientScene = {
            sceneId: "loading",
            data: {
                "text": "Finishing game"
            },
            teacher: false
        }
        gameInstance.currentTeacherScene = {
            sceneId: "loading",
            data: {
                "text": "Finishing game"
            },
            teacher: true
        }
        gameInstance.updateState()
        // Run the submitStats function
        await gameInstance.submitStats(gameInstance)
        // Set the teacher and client scenes to the dashboard & summary scene
        gameInstance.currentClientScene = Game.FindSceneById("studentdashboard")
        gameInstance.currentTeacherScene = Game.FindSceneById("teachersummary")
        gameInstance.updateState()
        // Disconnect all the players
        gameInstance.players.forEach((p) => {
            p.socket.disconnect()
        })
        // Delete the game
        GameManager.singleton.deleteGame(gameInstance.classid)
    }

    /**
     * Saves all statistics for the game
     * @param gameInstance GameInstance to run this on
     */
    async submitStats(gameInstance: Game = this) {
        console.log(`Saving GameStats for ${gameInstance.classid}`)
        // Get the database instance
        let database = Database.singleton;
        // Get the time
        let timestamp = new Date().getTime().toString();
        // Add the GameStats object
        await database.addGameStats({
            classId: gameInstance.classid,
            players: [], // Redundant as we can get this from google classroom
            questions: this.questions.map((question) => { return question.questionId }), // We only need IDs, The results from each question are stored in UserGameStats
            timestamp: timestamp
        })
        console.log(`Done`)
        // Create an array so that the tasks can run at once
        let tasks: Promise<IUserGameStatsDocument>[] = [];
        // Add the teacher's UserGameStats
        tasks.push(database.addUserGameStats({
            classId: gameInstance.classid,
            position: -1,
            questions: [],
            timestamp: timestamp,
            userId: gameInstance.host.details.googleid
        }))
        // Add the player's UserGameStats
        gameInstance.players.forEach((player, i) => {
            console.log(`[${i + 1}/${gameInstance.players.length}] Saving UserGameStats for ${player.details.name}`)
            tasks.push(database.addUserGameStats({
                classId: gameInstance.classid,
                position: i,
                questions: player.questionAnswers.map((answer) => { return answer.answer }),
                timestamp: timestamp,
                userId: player.details.googleid
            }))
            console.log(`[${i + 1}/${gameInstance.players.length}] Done`)
        })
        // Wait for all the tasks to finish
        await Promise.all(tasks)
        console.log("Done")
    }

    /**
     * Finds and displays the next question
     * @param gameInstance Current game instance
     */
    async nextQuestion(gameInstance: Game = this) {
        console.log("next question")
        // Get a question from the database
        //let question: IQuestionDocument = await Database.singleton.GetRandomQuestion();
        let question: IQuestion = await Database.singleton.GetQuestionInOrder(0, this.questions.length);
        if(!question){
            this.endGame(this);
            return;
        }
        // Set the currentQuestion object
        this.currentQuestion = {
            _id: "0:"+this.questions.length,
            answers: question.answers,
            correctAnswer: question.correctAnswer,
            exam: question.exam,
            question: question.question,
            timeLimit: question.timeLimit,
            type: question.type
        }
        // Set the question start time
        this.currentQuestionStartTime = new Date().getTime();
        // Add a new question answer data object
        this.questions.push({
            questionId: this.currentQuestion._id,
            questionNumber: this.questions.length,
            studentAnswers: []
        })
        // Force the time limit to be 15 seconds for testing
        //this.currentQuestion.timeLimit = 15;
        // Calculate the end time
        let endTime = new Date().getTime() + this.currentQuestion.timeLimit * 1000;
        // Setup the teacher and client scenes
        let CScene: StudentQuestionData = {
            answers: this.currentQuestion.answers,
            timeLimit: this.currentQuestion.timeLimit,
            endTime: endTime,
            number: this.questions.length
        }
        let TScene: TeacherQuestionData = {
            question: this.currentQuestion.question,
            answerCounts: [],
            answers: this.currentQuestion.answers,
            correctAnswer: -1,
            revealAnswers: false,
            studentAnswerCount: 0,
            timeLimit: this.currentQuestion.timeLimit,
            number: this.questions.length,
            endTime: endTime
        }
        this.currentClientScene = Game.FindSceneById("studentquestion");
        this.currentClientScene.data = CScene;
        this.currentTeacherScene = Game.FindSceneById("teacherquestion")
        this.currentTeacherScene.data = TScene;
        this.updateState()
        // Set a timeout to move to the answers
        let currentGameInstance = this
        let currentQuestionIndex = this.questions.length - 1
        if (this.questionTimer) {
            clearTimeout(this.questionTimer)
        }
        this.questionTimer = setTimeout(() => {
            currentGameInstance.next(currentGameInstance, {
                expectedQuestion: currentQuestionIndex,
                expectedState: "GAME"
            })
        }, this.currentQuestion.timeLimit * 1000)
    }

    /**
     * Runs each current scene's update function then sends the new data to all clients
     * @param options The clients to update
     */
    updateState(options: "TEACHER" | "STUDENT" | "BOTH" | "NONE" = "BOTH") {
        // If there is an update function, update the scene's data
        if (this.currentClientScene.update) {
            this.currentClientScene.data = this.currentClientScene.update(this, this.currentClientScene.data)
        }
        if (this.currentTeacherScene.update) {
            this.currentTeacherScene.data = this.currentTeacherScene.update(this, this.currentTeacherScene.data)
        }
        this.sendScene(options)
    }

    /**
     * Calculates the scores and loads the scoreboard scene on the teacher
     */
    showScoreboard() {
        // Sort the player list by score
        this.players = this.players.sort((a, b) => {
            return b.score - a.score
        });
        // Change the player list into a JSON friendly format
        let scoreboardData: ScoreboardData[] = [];
        this.players.forEach((p, i) => {
            if (i > 4) {
                return
            }
            scoreboardData.push({
                name: p.displayName,
                score: p.score
            })
        })
        this.currentTeacherScene = Game.FindSceneById("scoreboard")
        this.currentTeacherScene.data = {
            leaderboard: scoreboardData
        }
        this.sendScene("TEACHER")
    }

    /**
     * Goes to the next stage of the game
     * @param gameInstance The current game instance
     */
    next(gameInstance: Game = this, nextData?: NextData) {
        if (nextData) {
            if (gameInstance.state != nextData.expectedState || gameInstance.questions.length - 1 != nextData.expectedQuestion) {
                // This next was not intended by the client, or has already happened
                return
            }
        }
        console.log("next " + gameInstance.state)
        if (gameInstance.state == "LOBBY" || gameInstance.state == "SCOREBOARD") {
            // Move to the next question
            gameInstance.state = "GAME";
            console.log("Getting next question")
            gameInstance.nextQuestion(gameInstance)
            return
        }
        else if (gameInstance.state == "GAME") {
            // Reveal answers
            gameInstance.state = "ANSWERS";
            // Clear the answer timeout. The question has just finished
            clearTimeout(gameInstance.questionTimer);
            console.log("Revealing answers")
            gameInstance.currentClientScene = Game.FindSceneById("waitingForAnswers")
            gameInstance.updateState();
            return
        }
        else if (gameInstance.state == "ANSWERS") {
            // Move to the scoreboard
            gameInstance.state = "SCOREBOARD";
            console.log("Moving to scoreboard")
            gameInstance.showScoreboard()
            return
        }
    }
}
