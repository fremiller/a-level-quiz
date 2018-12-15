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
    // Useful data for your client-side scripts:
    var profile = googleUser.getBasicProfile();
    // The ID token you need to pass to your backend:
    var id_token = googleUser.getAuthResponse().id_token;
    var access_token = googleUser.getAuthResponse().access_token;
    // Stores the token for later authentication with socket.io
    GOOGLE_TOKEN = id_token;
    GOOGLE_ACCESS_TOKEN = access_token;
    // Shows the loading screen while we're sending the token to the server
    loadScene("loading", { text: "Logging in" });
    // Sends a POST request to the server with the token
    $.ajax({
        method: "POST",
        url: `/users/login/?id=${id_token}&token=${access_token}`,
        success: function (response) {
            // Sets the currentUser
            currentUser = response;
            // Loads the appropriate dashboard scene
            loadScene(currentUser.userType == 0 ? "studentdashboard" : "teacherdashboard");

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
    $.ajax({
        method: "POST",
        url: `/games/create?class=${document.getElementById("class").value}`,
        success: function (game) {
            currentGame = game;
            loadScene("loading", { text: "Connecting to game..." })
            connectToGame(game.code);
        }
    })
    loadScene("loading", { text: "Creating game" })
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

function openGameInfo(classId, timestamp){
    loadScene("loading", {text: "Getting game info"})
    loadGameInfo(classId, timestamp).then((gameInfo)=>loadScene("teachergameinfo", gameInfo));
}

function loadGameInfo(classId, timestamp){
    return new Promise(function(resolve, reject){
        $.ajax({
            method: "GET",
            url: `/games/data?token=${GOOGLE_TOKEN}&classId=${classId}&timestamp=${timestamp}`,
            success: function(gameInfo){
                resolve(gameInfo);
            }
        })
    })
}
/**
 * This contains functions for use when the game is actually running
 * This is the only script which is allowed to use socket.io
 */

let socket;
let currentQuestion;

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
function connectToGame(code) {
    // Connects to the socket.io server
    socket = io(`/?code=${code}&token=${GOOGLE_TOKEN}`);
    setupSocketEvents(socket)
}

function finishGame(){
    socket.emit("finishGame");
}

function lobbyContinue(){
    socket.emit("lobbyContinue")
}

function submitAnswer(id){
    console.log(`answer ${id}`)
    socket.emit("submitAnswer", id)
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

    socket.on("forceDisconnect", function(){
        socket.disconnect(true);
    })

    socket.on("revealAnswer", function(answerStats){
        console.log("Reveal answer")
        showCorrectAnswer(answerStats)
    })

    socket.on("scoreboard", function(question){
        loadScene("scoreboard", question)
    })

    // This runs when the server wants us to display a question
    socket.on("showQuestion", function (question) {
        console.log(question)
        loadScene(currentUser.userType == 0 ? "studentquestion" : "teacherquestion", question);
    })

    socket.on("hideAnswers", function(){
        loadScene("waitingForAnswers")
    })

    socket.on("numberOfAnswers", function(num){
        $("#numberAnswers").text(num)
    })

    // This is when the lobby has changed, and updates the screen accordingly
    socket.on("updateLobbyStatus", function (data) {
        currentGame = data.game;
        loadScene(currentUser.userType == 0 ? "studentlobby" : "teacherlobby");
    })

    socket.on("correctAnswer", function(data){
        if(currentUser.userType == 0){
            loadScene("correctanswer", data)
        }
    })

    socket.on("incorrectAnswer", function(data){
        if(currentUser.userType == 0){
            loadScene("incorrectanswer", data)
        }
    })
}

function continueQuestion(){
    socket.emit("continueQuestion");
}

function revealAnswersToPlayers(){
    socket.emit("revealAnswersToPlayers")
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
        if (intervalsToClear.length > 0) {
            intervalsToClear.forEach(function (interval) {
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
class AdminDashboard extends Scene{
    /**
     * @inheritdoc
     * @param {undefined} data 
     */
    generateHtml(data){
        return html`
<div class="header">
    <h1>Admin Dashboard</h1>
    <div class="headeruserdetails"><img src="${
            currentUser.profileImage
            }">
    </div>
</div><button class="bigbtn" onclick="createQuestion()">Create Question</button>`
    }
}
/**
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
      if (player.type == 0 && player.score > 0) {
        if (i > 4) {
          return;
        }
        leaderboard += `<h5>${player.name} <span>${player.score}</span></h5>`
      }
    })
    return html`
<div class="header">
  <h1>Scoreboard</h1><button onclick="finishGame()">Finish</button><button onclick="lobbyContinue()">Continue</button>
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
    </div>
</div>`;
    }
    postRender(data) {
        if (gapi) {
            gapi.signin2.render("g-signin", {
                scope: "profile email https://www.googleapis.com/auth/classroom.courses.readonly",
                onsuccess: onSignIn
            });
        }
    }
}/**
 * Student's dashboard
 * @extends Scene
 */
class StudentDashboard extends Scene {
    generateHtml(data) {
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
                pgBox += html`<div class="gamejoin">
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
        clearInterval(currentTimer);
        let answerBoxes = "";
        startTimer(question.timeLimit)
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
    <h1 id="timer"></h1>
</div>
<div class="answers">${answerBoxes}</div>`;
    }
}/**
 * Teacher dashboard scene
 * @extends Scene
 */
class TeacherDashboard extends Scene {
    generateHtml(data) {
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
    <h3 class="totip" data-main="6.4.3" data-topic="Electric Fields"><sup>&nbsp;</sup></h3><sup>&nbsp;</sup></h3><div class="vline"></div><h3 class="good">86%<sup>&nbsp;</sup></h3>
</div>`
            });
            $("#pastGames").html(pgBox);
        });
    }
}class TeacherGameInfo extends Scene{
    generateHtml(gameInfo){
        console.log(gameInfo)
        let sc = "";
        gameInfo.players.forEach((p, i)=>{
            if(i > 0){
                sc += html`<div class="hline"></div>`
            }
            sc += html`<div><h3>${int_to_pos(i)}</h3><h3>${p.details.name}</h3></div>`
        })
        return html`<div class="header">
            <h1>Game info</h1>
        </div>
        <div class="infoscoreboard">
            ${sc}
        </div>`
    }
}class TeacherLobby extends Scene {
  generateHtml(data) {
    let playerlist = "";
    for (let i = 0; i < currentGame.players.length; i++) {
      if (currentGame.players[i].type == 0) {
        playerlist += `<p>${currentGame.players[i].name}</p>`;
      }
    }
    return html`
<div class="header"><button class="lobbystartbutton" onclick="startgame()" ${(currentGame.players.length==1) ? "" : ""
    }>Start Game</button>${currentGame ? `
  <!--<div id="classroom-share" class="g-sharetoclassroom" data-title="Physics Quiz" data-body="Join the Quiz using the link here" data-url="http://localhost:8000/?gameCode="+currentGame.code></div>-->`
  : ""}<h1>Play at <span id="link"> ffsh.xyz</span></h1>
  <div class="headerplayercount">
    <h1>${
      currentGame.players.length - 1
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
    generateHtml(data) {
        clearInterval(currentTimer);
        currentQuestion = data;
        startTimer(data.timeLimit)
        let examStyle = data.type == "EXAM";
        let answerBoxes = "";
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
    <h1>Question ${data.number}</h1>
    <h1 id="timer"></h1>
    <button class="lobbystartbutton" onclick="continueQuestion()">Continue</button>
    <div class="headerplayercount">
        <h1 id="numberAnswers">${
            data.userAnswers ? data.userAnswers.length : 0
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
  teachergameinfo: TeacherGameInfo
}; // [Scene]

let intervalsToClear = [];
let currentScene = undefined;

/**
 * Displays a "scene" on the client
 * @param {String} tag The name of the scene
 * @param {*} data Any data to be given to the scene
 */
function loadScene(tag, data) {
  changeBackgroundColour("body-blue");
  currentScene = new scenes[tag]("#scene");
  currentScene.preRender();
  currentScene.onEnter();
  $("#scene").html(currentScene.generateHtml(data));
  currentScene.postRender();
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
    g += `<div class="gamejoin" onclick="connectToGame(${gam.id})"><h6>Found game</h6><h5>${gam.name}<h5></div>`
  })
  if (g == "") {
    g = "<h5>Searching for games...</h5>"
  }
  $("#joinGames").html(g);
}

let timeoutsToClear = [];

function showCorrectAnswer(data) {
  let revealLast = 0;
  let revealRandom = [];
  data.forEach(function (ans, i) {
    let ht = $("#answer-" + i).html()
    $("#answer-" + i).html(ht + `<span class="answerCount"> ${ans.count}</span>`);
    if (ans.correct) {
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
    if (data[answer].correct) {
      let t = setTimeout(() => $("#answer-" + answer).addClass("animated bounce"), 5000 + (300 * i));
      timeoutsToClear.push(t);
    }
    else {
      let t = setTimeout(() => $("#answer-" + answer).addClass("animated slideOutLeft").one("animationend", function () {
        $(this).removeClass('animated slideOutLeft');
        $(this).html("&zwnj;<span class='bold'>&zwnj;</span>");
        revealAnswersToPlayers();
        //if (typeof callback === 'function') callback();
      }), 5000 + (300 * i));
      timeoutsToClear.push(t);
    }
  })
  clearInterval(currentTimer);
  if (currentQuestion.type != "EXAM") {
    setTimeout(() => colourAnswer(data), 5000);
  }
}

function colourAnswer(data) {
  if (currentQuestion.type == "EXAM") {
    for (let i = 0; i < currentQuestion.answers.length; i++) {

    }
  } else {
    for (let i = 0; i < currentQuestion.answers.length; i++) {
      if (data[i].correct) {
        $("#answer-" + i).removeClass("answer").addClass("correctAnswer")
      }
      else {
        $("#answer-" + i).removeClass("answer").addClass("incorrectAnswer")
      }
    }
  }
}

function dropQuestion() {
  $(".exam.questiontitle").addClass("animated hinge slow");
}

let currentTimer = undefined;

function startTimer(tlimit) {
  let timer = tlimit;
  $("#timer").text(timer);
  let interval = setInterval(() => {
    $("#timer").text(timer);
    timer -= 1;
  }, 1000);
  setTimeout(() => {
    clearInterval(interval)
  }, tlimit * 1000)
  currentTimer = interval;
}

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

function int_to_pos(i){
  return ordinal_suffix_of(i+1)
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