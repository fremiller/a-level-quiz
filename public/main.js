"use-strict";

/**
 * This script runs on the client and handles all communication with the server
 */

//  currentUser: User
//  The user which is currently signed in
let currentUser = undefined;

//  currentGame: Game
//  The game which the user is currently in
let currentGame = undefined;

//  GOOGLE_TOKEN: String
//  The Google access token of the current user
let GOOGLE_TOKEN = undefined;
let ACCESS_TOKEN = undefined;
let classroom_data = {};

/**
 * Runs when the User successfully signs in with google.
 * @param {*} googleUser 
 */
function onSignIn(googleUser) {
    console.log(googleUser);
    if (googleUser.isTest) {
        GOOGLE_TOKEN = googleUser.token;
        GOOGLE_ACCESS_TOKEN = googleUser.token;
        loadScene("loading", { text: "Logging in with test user" });
    } else {
        // Useful data for your client-side scripts:
        var profile = googleUser.getBasicProfile();
        // The ID token you need to pass to your backend:
        GOOGLE_TOKEN = googleUser.getAuthResponse().id_token;
        GOOGLE_ACCESS_TOKEN = googleUser.getAuthResponse().access_token;
        // Shows the loading screen while we're sending the token to the server
        loadScene("loading", { text: "Logging in" });
    }
    // Sends a POST request to the server with the token
    $.ajax({
        method: "POST",
        url: `/users/login/?id=${GOOGLE_TOKEN}&token=${GOOGLE_ACCESS_TOKEN}`,
        success: function (response) {
            console.log(response)
            // Sets the currentUser
            currentUser = response;
            // Loads the appropriate dashboard scene
            loadScene(currentUser.userType == 0 ? "studentdashboard" : currentUser.userType == 1 ? "teacherdashboard" : "admindashboard");

        },
        error: function (err) {
            // Shows an error if there is one
            showError(err);
        }
    })
};

/**
 * Signs out of google account
 */
function signOut() {
    var auth2 = gapi.auth2.getAuthInstance();
    auth2.signOut().then(function () {
        console.log('User signed out.');
    });
}

/** 
 * Tells the server to create a game and joins it
*/
function creategame() {
    loadScene("loading", { text: "Getting topics" })
    $.ajax({
        method: "GET",
        url: `/topics/list`,
        success: function (data) {
            loadScene("createGame")
        }
    })
}

function getRunningGames() {
    $.ajax({
        method: "GET",
        url: "/games/user?id=" + GOOGLE_TOKEN,
        success: function (data) {
            showRunningGames(data.classesWithGames)
        }
    })
}

function creategamesubmit() {
    loadScene("loading", { text: "Connecting to game..." })
    connectToGame(document.getElementById("class").value, true);
}

/**
 * Joins a game based on the value of #codeinput
 */
function joinGame() {
    console.log("foo")
    if (document.getElementById("codeinput").value.length == 6) {
        connectToGame(document.getElementById("codeinput").value);
    }
}

function createQuestion() {
    loadScene("createquestion");
}

function getUserPastGames() {
    return new Promise(function (resolve, reject) {
        $.ajax({
            method: "GET",
            url: `/games/me?token=${GOOGLE_TOKEN}`,
            success: function (games) {
                resolve(games);
            }
        })
    });
}

function adminStateDisplay() {
    getAdminState().then(function (state) {
        console.log(state);
        $("#adminconsole").html(state.console.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>"));
        $("#adminstatus").html(state.status);
        updateScroll("adminconsole")
        let gl = "";
        state.games.forEach((g) => {
            gl += `<div class="clickable"><h3>${g.status}</h3><h3>${g.players}</h3></div>`;
        })
        if (state.games.length == 0) {
            gl = `<div><h3>No running games</h3></div>`;
        }
        $("#runningGamesList").attr("data-list-title", "Running Games " + state.games.length);
        $("#runningGamesList").html(gl);
        let al = `<div><button onclick='createTestAccount(false)' class="createButton">Create Teacher</button><button onclick='createTestAccount(true)' class="createButton">Create Student</button></div>`;
        state.testAccounts.forEach((acc, i) => {
            al += `<div class="clickable"><h3>${acc.name}</h3><h3>${acc.userType == 1 ? "TEACHER" : "STUDENT"}</h3><h3>${acc.token}</h3><button onclick="deleteTestAccount(${i})" class="btn-delete">Delete</button><button onclick="window.open('/?test=TEST_${i}')" class="btn-delete">Use</button></div>`
        })
        $("#testAccountList").html(al);
    })
}

/**
 * Tells the server to create a test account
 * @param {boolean} isTeacher Whether the account should be a teacher
 */
function createTestAccount(isTeacher) {
    $.ajax({
        method: "POST",
        url: `/admin/accounts/create?isTeacher=${isTeacher}&token=${GOOGLE_TOKEN}`
    })
}

function deleteTestAccount(index) {
    $.ajax({
        method: "POST",
        url: `/admin/accounts/delete?token=${GOOGLE_TOKEN}&index=${index}`
    })
}

function getAdminState() {
    return new Promise(function (resolve, reject) {
        $.ajax({
            method: "GET",
            url: "/admin/status?token=" + GOOGLE_TOKEN,
            success: function (state) {
                resolve(state);
            },
            error: function (err) {
                console.error(err);
                reject(err);
            }
        })
    })
}

function openGameInfo(classId, timestamp) {
    loadScene("loading", { text: "Getting game info" })
    loadGameInfo(classId, timestamp);
}

function loadGameInfo(classId, timestamp) {
    loadScene("statistics", {
        download: true,
        downloadURL: `/games/data/teacher?token=${GOOGLE_TOKEN}&classId=${classId}&timestamp=${timestamp}`,
        dataType: "teachergame"
    })
}
/**
 * This contains functions for use when the game is actually running
 * This is the only script which is allowed to use socket.io
 */

let socket;
let currentQuestion;
let currentCountdownEnd = 0;
let currentQuestionIndex = -1;
let currentState = "";

/**
* Starts a game when it is in the lobby
*/
function startgame() {
    loadScene("loading", { text: "Starting game" });
    socket.emit("startgame");
}

/**
 * Connects to the socket.io server and joins a game
 * @param {Number} code 
 */
function connectToGame(code, create = false) {
    // Connects to the socket.io server
    socket = io(`/?code=${code}&token=${GOOGLE_TOKEN}${create ? "&createGame=true" : ""}`, {
        reconnection: false
    });
    setupSocketEvents(socket)
}

function next() {
    socket.emit("next", {
        expectedQuestion: currentQuestionIndex,
        expectedState: currentState
    })
}

function end() {
    socket.emit("end")
}

function submitAnswer(id) {
    console.log(`answer ${id}`)
    socket.emit("answer", id)
}
/**
 * Adds all required events to the socket.io socket
 * This contains almost all game logic
 * @param {SocketIO.Socket} socket 
 */
function setupSocketEvents(socket) {
    // This runs when there is an error on the server
    socket.on("displayError", function (data) {
        loadScene("error", { text: data.text, status: "", continue: data.continue })
    });

    socket.on("forceDisconnect", function () {
        socket.disconnect(true);
    })

    socket.on("sceneUpdate", function (data) {
        console.log(data)
        if (data.data) {
            if (data.data.number) {
                currentQuestionIndex = data.data.number - 1;
            }
        }
        currentState = data.state
        loadScene(data.scene, data.data);
    })
}

function revealAnswersToPlayers() {
    socket.emit("revealanswers")
}let html = String.raw;
/**
 * Represents a scene which is displayed in the client
 */
class Scene {
    /**
     * Creates an empty scene 
     */
    constructor() {
        this.currentHtml = "";
    }

    /**
     * Runs before the scene is rendered.
     * Set up any global variables
     * @param {Object} data The data which is passed to the object
     */
    preRender(data) {
        if (timeoutsToClear.length > 0) {
            timeoutsToClear.forEach(function (interval) {
                clearInterval(interval);
            })
        }
    }

    /**
     * Runs when the scene enters
     * Put any animations here
     * @returns {Promise} Promise which resolves once the scene has entered
     */
    onEnter() {
        return new Promise(function (res) { res() });
    }

    /**
     * Generates HTML based on the data given
     * @param {Object} data Any data which needs to be displayed in html
     */
    generateHtml(data) {
        this.currentHtml = "<h1>Test</h1>"
        return this.currentHtml;
    }

    /**
     * Runs when the scene leaves
     * Put any animations here
     * @returns {Promise} Promise which resolves once the scene has left
     */
    onLeave(){
        if (intervalsToClear.length > 0) {
            intervalsToClear.forEach(function (interval) {
                clearInterval(interval);
            })
        }
        return new Promise(function(res) {res()});
    }

    /**
     * Runs once the scene has rendered
     * @param {Object} data Any additional data the object needs
     */
    postRender(data) {

    }
}

class SceneRenderer {
    constructor(renderId) {
        this.renderId = renderId;
    }

    render(scene, data) {
        new Scene.getSceneById(scene).render(this.renderId, data);
    }
}
/**
 * Administrator dashboard
 * @extends Scene
 */
class AdminDashboard extends Scene {
    preRender(data) {
        this.stateInterval = setInterval(adminStateDisplay, 1000);
        this.returnable = true
        this.regenerateHtml = true
    }
    /**
     * @inheritdoc
     * @param {undefined} data 
     */
    generateHtml(data) {
        return html `
<div class="header">
    <h1>Dashboard</h1>
    <div class="headeruserdetails"><img src="${
            currentUser.profileImage
            }">
    </div>
    
</div><!--<div id="adminstatus" class="status"></div>
            <div class="gitstatus">
                <p><span>1231542</span> by fishfred</p>
                <h3>Added git status</h3>
                <div class="pullbutton">Pull</div>
            </div>-->
    <div class="adminrow" id="admin-row-large">
    <div id="adminconsole" class="console">

    </div>
    <div id="runningGamesList" class="datalist" data-list-title="Running Games"></div>
    </div>
    <div id="testAccountList" class="datalist" data-list-title="Test Accounts"></div>
    <!--<button class="bigbtn" onclick="createQuestion()">Create Question</button>-->`
    }

    onLeave(){
        clearInterval(this.stateInterval);
        return new Promise(function(res){
            res();
        })
    }
}/**
 * Scene is shown if a student's answer is incorrect
 * @extends Scene
 */
class CorrectAnswer extends Scene {
    /**
     * @inheritdoc
     * @param {undefined} data 
     */
    generateHtml(score) {
        changeBackgroundColour("body-green");
        clearInterval(currentTimer);
        return html`
<div class="row">
    <div class="center-box center-block">
        <h1>Correct</h1>
        <p>You now have ${score} points</p>
    </div>
</div>`
    }
}/**
 * Scene is shown when a teacher wants to create a game
 * @extends Scene
 */
class CreateGameScene extends Scene {
  /**
   * @inheritdoc
   * @param {undefined} data 
   */
  generateHtml(data) {
    let classSelect = ""
    currentUser.classes.forEach(function (clas) {
      classSelect += `<option value=${clas.id}>${clas.name}</option>`
    })
    return html `
<div class="row">
  <div class="center-box center-block">
    <h1>Create game</h1>
    <form>
      <label for="topic">Topic</label>
      <select class="form-control" id="topic">
        <option>Electric Fields</option>
        <option>Magnetic Fields</option>
        <option>All</option>
        <option>Auto</option>
      </select>

      <label for="classs">Class</label>
      <select class="form-control" id="class">
        ${classSelect}
      </select>

      <label for="testselect">Gamemode</label>
      <select class="form-control" id="testselect">
        <option>Quiz</option>
        <option>Test</option>
      </select>
    </form>
    <button class="bigbtn" onclick="creategamesubmit()">Start</button>
  </div>
</div>`
  }
}/**
 * Scene is shown to create a scene
 * @extends Scene
 */
class CreateQuestion extends Scene {
  /**
   * @inheritdoc
   * @param {undefined} data 
   */
  generateHtml(data) {
    return html `
        <div class="row">
  <div class="center-box">
    <h1>Create Question</h1>
    <form>
      <label for="topic">Topic</label>
      <input id="topic" type="text">
      <label for="question">Question</label>
      <h1 class="questiontitle exam inpoot">
        <input type="text">
        <br><br><span class="examAnswer" id="answer-0"><span class="bold">A</span> <input type="text"></span>
        <br><br><span class="examAnswer" id="answer-1"><span class="bold">B</span> <input type="text"></span>
        <br><br><span class="examAnswer" id="answer-2"><span class="bold">C</span> <input type="text"></span>
        <br><br><span class="examAnswer" id="answer-3"><span class="bold">D</span> <input type="text"></span>
      </h1>
      <label for="testselect">Gamemode</label>
      <select class="form-control" id="testselect">
        <option>Quiz</option>
        <option>Test</option>
      </select>
    </form>
    <button class="bigbtn" onclick="creategamesubmit()">Start</button>
  </div>
</div>`
  }
}/**
 * Scene is shown when an error needs to be displayed
 * @extends Scene
 */
class ErrorScene extends Scene {
    /**
     * @param {Object} data 
     * @param {string} data.text The text of the error
     * @param {string} data.continue The scene to redirect to
     */
    generateHtml(data) {
        return html`
<div class="row">
    <div class="center-box center-block ">
        <h1>Error</h1>
        <p>${data.text}</p>
        ${(data.continue) ? `<button onclick="loadScene('${data.continue}')">Continue</button>` : `<p>Reload the page to
            try again</p>`}
    </div>
</div>`;
    }
}/**
 * Scene is shown once the game has finished
 * @extends Scene
 */
class Finish extends Scene {
    generateHtml(data) {
        return html`
        <div class="row">
            <div class="center-box center-block animated slideInUp">
                <h3>Thanks for playing</h3>
                <p>How would you rate this game?</p>
                <div class="feedbackButtons">
                    <div><p>1</p></div>
                    <div><p>2</p></div>
                    <div><p>3</p></div>
                    <div><p>4</p></div>
                    <div><p>5</p></div>
                </div>
                <p>Do you have any feedback?</p>
                <textarea></textarea>
            </div>
        </div>`;
    }
}/**
 * Scene is shown if the client's answer is incorrect
 * @extends Scene
 */
class IncorrectAnswer extends Scene {
    /**
     * @inheritdoc
     * @param {number} score The player's score 
     */
    generateHtml(score) {
        changeBackgroundColour("body-red");
        clearInterval(currentTimer);
        return html`
<div class="row">
    <div class="center-box center-block">
        <h1>Incorrect</h1>
        <p>You still have ${score} points</p>
    </div>
</div>`
    }
}/**
 * Scene is shown when loading
 * @extends Scene
 */
class LoadingScene extends Scene {
    /**
     * 
     * @param {Object} data
     * @param {string} data.text The text to display while loading
     */
    generateHtml(data) {
        return html`
        <div class="row">
            <div class="center-box center-block animated slideInUp">
                <div class="lds-ring">
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                </div>
                <h1>Loading</h1>
                <p>${
                  data.text ? data.text : ""
                  }</p>
            </div>
        </div>`;
    }
}/**
 * Contains a sign in button and welcome text
 * @extends Scene
 */
class Privacy extends Scene {
    generateHtml(data) {
        return html`
<div class="row">
    <div class="center-box center-block animated slideInUp">
        <h1>Privacy</h1>
        <p>The only personally identifiable information we store is your full name (from your google account)</p>
        <p>We also store your profile picture and google account ID</p>
        <p>To access classes you're in, we query google APIs, access to which can be revoked at any time.</p>
        <p>All other data stored is game performance, which cannot be opted out of, as it is crucial to the function of the service</p>
    </div>
</div>`;
    }
}/**
 * Game scoreboard
 * @extends Scene
 */
class Scoreboard extends Scene {
  /**
   * 
   * @param {Object} data 
   * @param {Object[]} data.leaderboard The current player leaderboard
   * @param {string} data.leaderboard.name The player's name
   * @param {number} data.leaderboard.score The player's score
   * @param {number} data.leaderboard.type The player's type
   * @param {string} data.fact Text to display about the question
   */
  generateHtml(data) {
    let leaderboard = "";
    console.log(data)
    data.leaderboard.forEach(function (player, i) {
      leaderboard += `<h5>${player.name} <span>${player.score}</span></h5>`
    })
    return html`
<div class="header">
  <h1>Scoreboard</h1><button onclick="end()">Finish</button><button onclick="next()">Continue</button>
</div>
<h3>${data.fact ? data.fact : ""}</h3>
<div class="leaderboard">${leaderboard}</div>`;
  }
}/**
 * Contains a sign in button and welcome text
 * @extends Scene
 */
class SignIn extends Scene {
    generateHtml(data) {
        return html`
<div class="row">
    <div class="center-box center-block animated slideInUp">
        <h1>Quiz</h1>
        <p>orleanspark.school emails only</p>
        <div id="google-align">
            <div id="g-signin" class="g-signin2" data-onsuccess="onSignIn" data-theme="dark" style="display: block; margin: 0 auto;"></div>
        </div>
        <p><a onclick="loadScene('privacy')">Privacy</a></p>
    </div>
</div>`;
    }
    postRender(data) {
        const urlParams = new URLSearchParams(window.location.search);
        const testToken = urlParams.get('test');
        console.log(testToken)
        if (testToken) {
            onSignIn({
                isTest: true,
                token: testToken
            })
        }
        else {
            if (gapi) {
                gapi.signin2.render("g-signin", {
                    scope: "profile email https://www.googleapis.com/auth/classroom.courses.readonly",
                    onsuccess: onSignIn
                });
            }
        }
    }
}/**
 * @typedef {Object} StatisticsData
 * @property {boolean} download
 * @property {string} downloadURL
 * @property {Object} data
 * @property {"teachergame"|"teacherquestion"} dataType
 */

 /**
 * @typedef {Object} UserGameStatsData
 * 
 * This is a structure used in the User and GameStats object
 * to store the performance of one user in one game.
 *
 * @property {string} gameId - The ID of the game which can be used to find other players in the game
 * @property {string} timeStamp - The time when the game finished
 * @property {number} score - The score that the user got
 * @property {number} position - What position the player came in the leaderboard
 * @property {string} userId - The ID of the user which can be used to get details of the user
 * @property {number[]} questions - Question answers
 * @property {string} classId The id of the user's class
 * @property {Object} details User information
 */

let currentGameData = undefined;

function reloadStats(datatype, params){
    loadScene("statistics", {
        params: params,
        download: false,
        data: currentGameData,
        dataType: datatype
    })
}

class Statistics extends Scene {
    /**
     * 
     * @param {StatisticsData} data 
     */
    async preRender(data) {
        this.downloadedData = data.data;
        this.returnable = true;
        this.renderData = {};
        let sceneInstance = this;
        if (data.download) {
            await new Promise(function (resolve, reject) {
                $.ajax({
                    method: "GET",
                    url: data.downloadURL,
                    success: function (downloadedData) {
                        sceneInstance.downloadedData = downloadedData;
                        resolve(downloadedData);
                    }
                })
            });
        }
        console.log("Data downloaded")
        if (!statsProcessData[data.dataType]){
            throw `Datatype ${data.dataType} not defined`
        }
        sceneInstance.renderData = statsProcessData[data.dataType](this.downloadedData, data.params);
        currentGameData = this.downloadedData;
        return
    }

    generateHtml(data) {
        if (!this.renderData){
            throw "No data processed to render."
        }
        console.log(this.renderData)
        let body = "";
        for (var key in this.renderData){
            console.log(key)
            let value = this.renderData[key];
            console.log(value)
            if (key == "title"){
                continue;
            }
            if (typeof value == "object"){
                console.log("Type object")
                // This is a list
                body += renderList(value, key);
            }
            else{
                console.log("Type value")
                // This is a normal key value pair
                body += renderAttribute(key, value)
            }
        }
        return html`<div class="header"><h1>${this.renderData.title}</h1></div>${body}`
    }

    postRender(data) {

    }
}

/**
 * This should process the data so that it can be rendered.
 */
const statsProcessData = {
    /**
     * This scene shows a summary of a game for a teacher
     * @param {Object} data Data to process
     * @param {String} data.timestamp
     * @param {UserGameStatsData[]} data.players
     * @param {QuestionData[]} data.questions
     * @returns {Object} Renderable data
     */
    "teachergame": function(data){
        console.log(data)
        let date = timestampToDate(data.timestamp);

        // Generate HTML for each player
        let playerList = [];
        data.players.forEach((p)=>{
            if(p.position == -1){
                // This is the teacher
                return;
            }
            playerList.push(html`<div><h3>${p.position+1}</h3><div class="vline"></div><h3>${p.details?p.details.name:p.userId}</h3></div>`)
        });

        // Generate HTML for each question
        let questionList = [];
        data.questions.forEach((q, qi)=>{
            let correctAnswer = q.correctAnswer;
            let correct = 0;
            let total = 0;
            data.players.forEach((p, i)=>{
                if(p.position == -1){
                    return
                }
                if(p.questions[qi] == correctAnswer){
                    correct++;
                }
                total ++;
            })
            let percentCorrect = Math.round(correct/total * 1000) / 10;
            questionList.push(html`<div class="clickable" onclick="reloadStats('teacherquestion', {questionIndex: ${qi}})"><h3 class="title">${q.question}</h3><div class="vline"></div><h3 class="${percentCorrect < 40?"bad":percentCorrect < 60?"okay":"good"}">${percentCorrect}%</h3></div>`)
        });
        return {
            title: "Game information",
            time: date,
            Players: playerList,
            Questions: questionList
        }
    },
    /**
     * This contains information about a question for an entire class
     * The question
     * The 4 answers
     * The percentage correct
     * The Players and their answers
     * @param {Object} data Data to process
     * @param {number} questionIndex
     * @param {String} data.timestamp
     * @param {UserGameStatsData[]} data.players
     * @param {QuestionData[]} data.questions
     * @param {Object} params
     * @param {number} questionIndex
     * @returns {Object} Renderable data
     */
    "teacherquestion": function(data, params){
        console.log(data)
        let question = data.questions[params.questionIndex];
        let questionTitle = question.question;
        let questionAnswer = question.answers.map((a)=>{return `<h3>${a}</h3>`})
        let students = [];
        let questionCorrectAnswer = question.correctAnswer;
        let totalCorrect = 0;
        let percentCorrect = 0;
        data.players.forEach((player, i)=>{
            if(player.position ==  -1){
                return;
            }
            let studentAnswer = player.questions[params.questionIndex]
            let studentCorrect = studentAnswer == questionCorrectAnswer;
            totalCorrect += studentCorrect?1:0
            console.log(studentCorrect?"Correct":"Incorrect");
            let studentName = player.details?player.details.name:player.userId;
            students.push(`<div><h3>${studentName}</h3><h3 class=${studentCorrect?"good":"bad"}>${studentAnswer}</h3></div>`)
        })
        percentCorrect = totalCorrect / (data.players.length - 1)
        return {
            title: `Question ${params.questionIndex}`,
            Question: questionTitle,
            Correct: percentCorrect,
            Answers: questionAnswer,
            Students: students
        }
    }
}

/**
 * Turns a timestamp string into a date.
 * Format DD/MM/YYYY
 * @param {string} timestamp The timestamp to turn into a date
 * @returns {string} date The date in DD/MM/YYYY
 */
function timestampToDate(timestamp){
    let date = new Date(Number.parseInt(timestamp));
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}`
}

/**
 * Puts a list of strings into a list HTML element
 * @param {String[]} elements List of elements to display
 */
function renderList(elements, title){
    let listBody = "";
    elements.forEach((e, i)=>{
        if (i > 0){
            // Put in a seperator
            listBody += html`<div class="hline"></div>`;
        }
        listBody += e
    })
    return html`<div class="datalist" data-list-title="${title}">${listBody}</div>`
}

/**
 * Renders a key and value to html
 * @param {string} key The key to render
 * @param {string|number} value The value to render
 * @returns {string} HTML key and value
 */
function renderAttribute(key, value){
    return html`<div class="dataattribute"><span class="key">${key}</span>${value}</div>`
}/**
 * Student's dashboard
 * @extends Scene
 */
class StudentDashboard extends Scene {
    generateHtml(data) {
        this.returnable = true
        this.regenerateHtml = true
        getRunningGames()
        setInterval(getRunningGames, 5000);
        return html`
<div class="header">
    <h1>Dashboard</h1>
    <div class="headeruserdetails"><img src="${
            currentUser.profileImage
            }">
        <div>
            <h5>${currentUser.name}</h5>
            <h6>${
            currentUser.domain
            }</h6>
        </div>
    </div>
</div>
<div id="joinGames">

</div>
</div>`;
    }

    postRender() {
        getUserPastGames().then(function (games) {
            let pgBox = "";
            console.log(games);
            games.forEach(g => {
                let className = "";
                currentUser.classes.forEach((clas) => {
                    if (clas.id == g.classId) {
                        className = clas.name;
                    }
                })
                let date = new Date(Number.parseInt(g.timestamp));
                pgBox += html`<div class="gamejoin flex">
                <h3 class="gold">1<sup>st</sup></h3>
    <div><h5>${className}</h5>
    <h6>${date.getDate()}/${date.getMonth()}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}</h6></div>
    <h3 class="totip" data-main="6.4.3" data-topic="Electric Fields"><sup>&nbsp;</sup></h3><sup>&nbsp;</sup></h3><div class="vline"></div><h3 class="good">86%<sup>&nbsp;</sup></h3>
</div>`
            });
            $("#pastGames").html(pgBox);
        });
    }
}
/**
 * Student lobbys scene
 * @extends Scene
 */
class StudentLobby extends Scene {
    generateHtml(data) {
        return html`
<div class="slobby">
    <div class="lds-ring">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
    </div>
    <h3>Connected</h3>
    <h5>Go fullscreen for the best experience</h5><button onclick="toggleFullscreen()">Fullscreen</button>
</div>`;
    }
}/**
 * Student question - shows answer buttons
 * @extends Scene
 */
class StudentQuestion extends Scene {
    generateHtml(question) {
        let timeOffset = question.time - new Date().getTime();
        question.endTime += timeOffset;
        let answerBoxes = "";
        currentCountdownEnd = question.endTime
        let e = this
        this.currentTimer = setInterval(()=>{
          let t = (currentCountdownEnd - new Date().getTime())/1000;
          $("#timer").html(t>0?Math.round(t):"")
          if (t < 0){
            clearInterval(e.currentTimer)
          }
        }, 200)
        question.answers.forEach((answer, i) => {
            answerBoxes += html`
<div id="answer-${i}" class="answer normal" onclick="submitAnswer(${i})">
    <div>
        <div>${answer}</div>
    </div>
</div>`;
        });
        return html`
<div class="header questionheader">
    <h1>Question ${question.number}</h1>
    <h1 id="timer">${Math.round((currentCountdownEnd - new Date().getTime())/1000)}</h1>
</div>
<div class="answers">${answerBoxes}</div>`;
    }
}/**
 * Teacher dashboard scene
 * @extends Scene
 */
class TeacherDashboard extends Scene {
    generateHtml(data) {
        this.returnable = true
        this.regenerateHtml = true
        return html`
<div class="header">
    <h1>Dashboard</h1>
    <div class="headeruserdetails"><img src="${
            currentUser.profileImage
            }">
        <div>
            <h5>${currentUser.name}</h5>
            <h6>${
            currentUser.domain
            }</h6>
        </div>
    </div>
</div><button class="bigbtn" onclick="creategame()">Create Game</button>
<div id="pastGames">Loading past games...</div>`;
    }

    postRender() {
        getUserPastGames().then(function (games) {
            let pgBox = "";
            console.log(games);
            games.forEach(g => {
                let className = "";
                currentUser.classes.forEach((clas) => {
                    if (clas.id == g.classId) {
                        className = clas.name;
                    }
                })
                let date = new Date(Number.parseInt(g.timestamp));
            pgBox += html`<div class="gamejoin" onclick="openGameInfo('${g.classId}', '${g.timestamp}')">
                <!-- <h3 class="gold">1<sup>st</sup></h3> -->
    <div><h5>${className}</h5>
    <h6>${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}</h6></div>
    <sup>&nbsp;</sup><h3 class="totip" data-main="6.4.3" data-topic="Electric Fields"><sup>&nbsp;</sup></h3></h3><div class="vline"></div><h3 class="good">86%<sup>&nbsp;</sup></h3>
</div>`
            });
            $("#pastGames").html(pgBox);
        });
    }
}class TeacherGameInfo extends Scene{
    generateHtml(gameInfo){
        console.log(gameInfo)
        let date = new Date(Number.parseInt(gameInfo.timestamp));

        let sc = "";
        gameInfo.players.sort((a, b)=>{
            return a.position - b.position
        })
        gameInfo.players.forEach((p, i)=>{
            if (p.position == -1){
                // This is the teacher
                return
            }
            if(p.position > 0){
                sc += html`<div class="hline"></div>`
            }
            console.log(p)
            sc += html`<div><h3>${p.position+1}</h3><div class="vline"></div><h3>${p.details?p.details.name:p.userId}</h3></div>`
        })
        
        let ql = "";
        gameInfo.questions.forEach((q, qi)=>{
            let correctAnswer = q.correctAnswer;
            let correct = 0;
            let total = 0;
            gameInfo.players.forEach((p, i)=>{
                if(p.position == -1){
                    return
                }
                if(p.questions[qi] == correctAnswer){
                    correct++;
                }
                total ++;
            })
            let percentCorrect = Math.round(correct/total * 1000) / 10;
            ql += html`<div><h3 class="title">${q.question}</h3><div class="vline"></div><h3 class="${percentCorrect < 40?"bad":percentCorrect < 60?"okay":"good"}">${percentCorrect}%</h3></div>`
        });
        return html`<div class="header">
            <h1 onclick="loadScene('teacherdashboard')" class="back">Back</h1>
        </div>
        <div class="datalist" data-list-title="About">
        <div><h3>Time Played</h3><div class="vline"></div><h3>${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}</h3></div>
        <div><h3>Players</h3><div class="vline"></div><h3>${gameInfo.players.length}</h3></div>
        <div><h3>Number of questions</h3><div class="vline"></div><h3>${gameInfo.questions.length}</h3></div>
        </div>
        <div class="datalist" data-list-title="Students">
            ${sc}
        </div>
        <div class="datalist" data-list-title="Questions">
            ${ql}
        </div>`
    }
}/**
 * Scene contains player list and start button
 * @extends Scene
 */
class TeacherLobby extends Scene {
  /**
   * 
   * @param {Object} data
   * @param {String[]} data.players 
   */
  generateHtml(data) {
    console.log(data)
    let playerlist = "";
    for (let i = 0; i < data.players.length; i++) {
        playerlist += `<p>${data.players[i]}</p>`;
    }
    return html`
<div class="header"><button class="lobbystartbutton" onclick="next()">Start Game</button><h1>Play at <span id="link"> ffsh.xyz</span></h1>
  <div class="headerplayercount">
    <h1>${
      data.players.length
      }</h1>
    <h6 class="mini">Players</h6>
  </div>
</div>
<div id="players">${playerlist}</div>`;
  }
}/**
 * Teacher question scene. Shows question and answer options
 * @extends Scene
 */
class TeacherQuestion extends Scene {
  /**
   * 
   * @param {Object} data Question data
   * @param {String} data.question Question title
   * @param {number[]} data.answerCounts Amount of answers to each question
   * @param {number} data.correctAnswer The correct answer to the question
   * @param {boolean} data.revealAnswers Whether the answer should be revealed
   * @param {number} data.studentAnswerCount The amount of answers recieved
   * @param {number} data.timeLimit The amount of time to count down for
   * @param {number} data.endTime The time when the countdown ends
   * @param {String[]} data.answers The question's answers
   */
  generateHtml(data) {
    let timeOffset = data.time - new Date().getTime();
    data.endTime -= timeOffset;
    if (data.revealAnswers) {
      this.showCorrectAnswer(data.answerCounts, data.correctAnswer)
    }
    clearInterval(currentTimer);
    currentQuestion = data;
    currentCountdownEnd = data.endTime
    let e = this
    let last_t = Infinity;
    if (!data.revealAnswers) {
      this.currentTimer = setInterval(() => {
        let t = (currentCountdownEnd - new Date().getTime()) / 1000;
        let t_round = Math.round(t);
        $("#timer").html(t > 0 ? t_round : "")
        if (last_t > t_round && t <= 10) {
          last_t = t_round;
          e.displayCountdown(t_round);
        }
        if (t_round < 0){
          e.hideCountdown()
        }
        if (t < 0) {
          clearInterval(e.currentTimer)
        }
      }, 200)
    }

    let examStyle = true;
    let answerBoxes = "";
    data.exam = "";
    if (!examStyle) {
      data.answers.forEach((answer, i) => {
        answerBoxes += `<div class="answer normal" id="answer-${i}"><div><div>${answer}</div></div></div>`;
      });
    } else {
      data.answers.forEach((answer, i) => {
        answerBoxes += `<br><br><span class="examAnswer" id="answer-${i}"><span class="bold">${"ABCD"[i]}</span> ${answer}</span>`;
      });
    }
    return html`
<div class="header">
<p id="countdown">5</p>
    <h1>Question ${data.number}</h1>
    <h1 id="timer">${Math.round((currentCountdownEnd - new Date().getTime()) / 1000)}</h1>
    <button class="lobbystartbutton" onclick="next()">Continue</button>
    <div class="headerplayercount">
        <h1 id="numberAnswers">${
      data.studentAnswerCount
      }</h1>
        <h6 class="mini">Answers</h6>
    </div>
</div>
<h1 class="questiontitle ${examStyle ? " exam" : ""}">${(examStyle && data.exam) ? "[" + data.exam + "]<br>" : ""}${
      data.question.replace(/\n/g, "<br>")
      }${examStyle ? answerBoxes : ""}</h1>
<p class="questiondescription">${
      data.description ? data.description.replace(/\n/g, "<br>") : ""
      }</p>
<div class="answers host">${examStyle ? "" : answerBoxes}</div>`;
  }

  showCorrectAnswer(counts, correctAnswer) {
    let revealLast = 0;
    let revealRandom = [];
    counts.forEach(function (count, i) {
      let ht = $("#answer-" + i).html()
      $("#answer-" + i).html(ht + `<span class="answerCount"> ${toString(count)}</span>`);
      if (i == correctAnswer) {
        revealLast = i;
      }
      else {
        revealRandom.push(i);
      }
    })
    let revealQueue = shuffle(revealRandom);
    revealQueue.push(revealLast);
    revealQueue.forEach((answer, i) => {
      let ht = $("#answer-" + answer).html()
      if (i == counts.length - 1) {
        // This is the last (the correct) answer
        let t = setTimeout(() => $("#answer-" + answer).addClass("animated bounce"), (300 * i));
        timeoutsToClear.push(t);
      }
      else {
        let t = setTimeout(() => $("#answer-" + answer).addClass("animated slideOutLeft").one("animationend", function () {
          $(this).removeClass('animated slideOutLeft');
          $(this).html("&zwnj;<span class='bold'>&zwnj;</span>");
          revealAnswersToPlayers();
        }), (300 * i));
        timeoutsToClear.push(t);
      }
    })
    clearInterval(this.currentTimer);
  }

  displayCountdown(number) {
    $("#countdown").show();
    $("#countdown").removeClass("animated heartBeat fast");
    void document.getElementById("countdown").offsetWidth
    $("#countdown").html(number)
    $("#countdown").addClass("animated heartBeat fast").one("animationend", function () {
      $(this).removeClass("animated heartBeat fast")
    })
  }

  hideCountdown() {
    $("#countdown").hide()
  }

  onLeave(){
    clearInterval(this.currentTimer)
    return super.onLeave()
  }
}class TeacherSummary extends Scene{
    /**
     * Generates HTML for the TeacherSummary scene
     * @param {Object} data TeacherSummary data
     * @param {Object[]} data.leaderboard
     * @param {String} data.leaderboard.name
     * @param {Number} data.leaderboard.score
     * @param {Number} data.numberOfQuestions
     */
    generateHtml(data){
        let lbhtml = data.leaderboard.map((item)=>{return html`<h3>${item.name}<span>${item.score}</span></h3>`})
        return html`<div class="header">
            <h1>Summary</h1><p>${data.numberOfQuestions} Questions</p>
            <button class="lobbystartbutton" onclick="loadScene('teacherdashboard')">Continue</button>
            </div>
        ${lbhtml}`
    }
}/**
 * Scene is shown while the student is waiting for answers
 * @extends Scene
 */
class WaitingForAnswers extends Scene {
    generateHtml(data) {
        clearInterval(currentTimer);
        return html`
<div class="row">
    <div class="center-box center-block">
        <div class="lds-ring">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
        </div>
        <h1>Waiting</h1>
    </div>
</div>`
    }
}let tick = `<svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52"><circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/><path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/></svg>`
let getInterval;

let scenes = {
  signin: SignIn,
  error: ErrorScene,
  loading: LoadingScene,
  createGame: CreateGameScene,
  studentdashboard: StudentDashboard,
  teacherdashboard: TeacherDashboard,
  teacherlobby: TeacherLobby,
  studentlobby: StudentLobby,
  studentquestion: StudentQuestion,
  teacherquestion: TeacherQuestion,
  scoreboard: Scoreboard,
  waitingForAnswers: WaitingForAnswers,
  correctanswer: CorrectAnswer,
  incorrectanswer: IncorrectAnswer,
  createquestion: CreateQuestion,
  admindashboard: AdminDashboard,
  teachergameinfo: TeacherGameInfo,
  finish: Finish,
  privacy: Privacy,
  teachersummary: TeacherSummary,
  statistics: Statistics
}; // [Scene]

let intervalsToClear = [];
let currentScene = undefined;
let currentSceneName = undefined;

let sceneStack = [];
let newSceneStackItem = {};
/**
 * Displays a "scene" on the client
 * @param {String} tag The name of the scene
 * @param {*} data Any data to be given to the scene
 */
async function loadScene(tag, data, html, regenerateHtml = true, goingBack=false) {
  if (currentScene) {
    if (currentScene.returnable && !goingBack) {
      sceneStack.push(newSceneStackItem)
    }
    await currentScene.onLeave();
  }
  changeBackgroundColour("body-blue");
  currentScene = new scenes[tag]("#scene");
  await currentScene.preRender(data);
  await currentScene.onEnter(data);
  let generatedHtml = regenerateHtml ? currentScene.generateHtml(data) : html;
  $("#scene").html(generatedHtml);
  currentScene.postRender(data);
  currentSceneName = tag;
  newSceneStackItem = {
    scene: currentScene,
    html: generatedHtml,
    regenerateHtml: currentScene.regenerateHtml,
    tag: tag,
    data: data
  };
  if(sceneStack.length > 0 && ["creategame", "teacherlobby", "studentlobby", "statistics", "privacy", "error"].indexOf(tag) != -1){
    // make back button appear in header
    let header = $(".header")
    header.html("<button onclick='back()'>Back</button>" + header.html())
  }
}

async function back() {
  if (sceneStack.length > 0) {
    let scene = sceneStack.pop();
    await loadScene(scene.tag, scene.data, scene.generatedHtml, scene.regenerateHtml, true)
  }
}

/**
 * Displays an error on the page
 * @param {{"err": String, "text": String}} err
 */
function showError(err) {
  loadScene("error", {
    status: err.statusCode,
    text: err.responseText,
    continue: err.continue
  });
}

const colours = ["body-green", "body-blue", "body-red"];

function changeBackgroundColour(c) {
  let r = "";
  let a = "";
  colours.forEach((colour) => {
    if (colour == c) {
      a += " " + colour;
    }
    else {
      r += " " + colour;
    }
  })
  if (a == "") {
    a += colours[1];
  }
  $("body").removeClass(r).addClass(a);
}

function showRunningGames(games) {
  let g = "";
  games.forEach((gam) => {
    g += `<div class="gamejoin" onclick="connectToGame('${gam.id}')"><h6>Found game</h6><h5>${gam.name}<h5></div>`
  })
  if (g == "") {
    g = "<h5>Searching for games...</h5>"
  }
  $("#joinGames").html(g);
}

let timeoutsToClear = [];

function dropQuestion() {
  $(".exam.questiontitle").addClass("animated hinge slow");
}

let currentTimer = undefined;

$(function () {
  loadScene("signin");
  //setInterval(checkFullscreen, 10000);
  window.scrollTo(0, 1);
});

/* Get the documentElement (<html>) to display the page in fullscreen */
var elem = document.documentElement;

document.onwebkitfullscreenchange = checkFullscreen;
document.onfullscreenchange = checkFullscreen;

let FULLSCREEN_ENABLED = true;

function checkFullscreen() {
  var doc = window.document;
  var docEl = doc.documentElement;
  console.log("check")
  if (!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement && FULLSCREEN_ENABLED) {
    $("#fullscreenBox").show();
  } else {
    $("#fullscreenBox").hide();
  }
}

function toggleFullscreen() {
  var doc = window.document;
  var docEl = doc.documentElement;

  var requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
  var cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

  if (!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
    $("#fullscreenBox").hide();
    requestFullScreen.call(docEl);
  } else {
    cancelFullScreen.call(doc);
  }
}

function shuffle(a) {
  var j, x, i;
  for (i = a.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    x = a[i];
    a[i] = a[j];
    a[j] = x;
  }
  return a;
}

function int_to_pos(i) {
  return ordinal_suffix_of(i + 1)
}

function ordinal_suffix_of(i) {
  var j = i % 10,
    k = i % 100;
  if (j == 1 && k != 11) {
    return i + "st";
  }
  if (j == 2 && k != 12) {
    return i + "nd";
  }
  if (j == 3 && k != 13) {
    return i + "rd";
  }
  return i + "th";
}

function updateScroll(elementid) {
  var element = document.getElementById(elementid);
  element.scrollTop = element.scrollHeight;
}