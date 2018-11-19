let tick = `<svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52"><circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/><path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/></svg>`
let getInterval;
let scenes = {
  signin: function (data) {
    return /*html*/ `<div class="row">
    <div class="center-box center-block "><h1>Quiz</h1>
            <p>orleanspark.school emails only</p>
            <div id="google-align">
                <div id="g-signin" class="g-signin2" data-onsuccess="onSignIn" data-theme="dark" style="display: block; margin: 0 auto;"></div>
            </div></div>
</div>`;
  },
  error: function (data) {
    return /*html*/ `<div class="row">
    <div class="center-box center-block "><h1>Error ${data.status}</h1>
        <p>${data.text}</p>
        ${(data.continue)?`<button onclick="loadScene('${data.continue}')">Continue</button>`:`<p>Reload the page to try again</p>`}</div>
    </div>`;
  },
  loading: function (data) {
    return /*html*/`<div class="row">
            <div class="center-box center-block"><div class="lds-ring"><div></div><div></div><div></div><div></div></div><h1>Loading</h1><p>${
      data.text ? data.text : ""
      }</p>
            </div>
            </div></div>`;
  },
  createGame: function (data) {
    let classSelect = ""
    currentUser.classes.forEach(function (clas) {
      classSelect += `<option value=${clas.id}>${clas.name}</option>`
    })
    return /*html*/ `<div class="row"><div class="center-box center-block"><h1>Create game</h1><form>
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
  <button class="bigbtn" onclick="creategamesubmit()">Start</button></div></div>`
  },
  studentdashboard: function (data) {
    getRunningGames()
    setInterval(getRunningGames, 5000);
    return /*html*/ `<div class="header"><h1>Dashboard</h1><div class="headeruserdetails"><img src="${
      currentUser.profileImage
      }"><div><h5>${currentUser.name}</h5><h6>${
      currentUser.domain
      }</h6></div></div></div>
        <div id="joinGames">

        </div>
      </div>`;
  },
  teacherdashboard: function (data) {
    return /*html*/ `<div class="header"><h1>Dashboard</h1><div class="headeruserdetails"><img src="${
      currentUser.profileImage
      }"><div><h5>${currentUser.name}</h5><h6>${
      currentUser.domain
      }</h6></div></div></div><button class="bigbtn" onclick="creategame()">Create Game</button>`;
  },
  teacherlobby: function (data) {
    let playerlist = "";
    for (let i = 0; i < currentGame.players.length; i++) {
      if (currentGame.players[i].type == 0) {
        playerlist += `<p>${currentGame.players[i].name}</p>`;
      }
    }
    return /*html*/ `<div class="header"><button class="lobbystartbutton" onclick="startgame()" ${(currentGame.players.length == 1) ? "" : ""}>Start Game</button>${currentGame ? `<!--<div id="classroom-share" class="g-sharetoclassroom" data-title="Physics Quiz" data-body="Join the Quiz using the link here" data-url="http://localhost:8000/?gameCode="+currentGame.code></div>-->` : ""}<h1>Play at <span id="link"> ffsh.xyz</span></h1><div class="headerplayercount"><h1>${
      currentGame.players.length - 1
      }</h1><h6 class="mini">Players</h6></div></div><div id="players">${playerlist}</div>`;
  },
  studentlobby: function (data) {
    return /*html*/ `<div class="slobby"><div class="lds-ring"><div></div><div></div><div></div><div></div></div><h3>Connected</h3><h5>Go fullscreen for the best experience</h5><button onclick="toggleFullscreen()">Fullscreen</button></div>`;
  },
  studentquestion: function (question) {
    clearInterval(currentTimer);
    let answerBoxes = "";
    startTimer(question.timeLimit)
    question.answers.forEach((answer, i) => {
      answerBoxes += `<div id="answer-${i}" class="answer normal" onclick="submitAnswer(${i})"><div><div>${answer}</div></div></div>`;
    });
    return /*html*/ `<div class="header questionheader"><h1>Question ${question.number}</h1><h1 id="timer"></h1></div><div class="answers">${answerBoxes}</div>`;
  },
  teacherquestion: function (question) {
    clearInterval(currentTimer);
    console.log(question);
    currentQuestion = question;
    startTimer(question.timeLimit)
    let examStyle = question.type == "EXAM";
    let answerBoxes = "";
    if (!examStyle) {
      question.answers.forEach((answer, i) => {
        answerBoxes += `<div class="answer normal" id="answer-${i}"><div><div>${answer}</div></div></div>`;
      });
    } else {
      question.answers.forEach((answer, i) => {
        answerBoxes += `<br><br><span class="examAnswer" id="answer-${i}"><span class="bold">${"ABCD"[i]}</span> ${answer}</span>`;
      });
    }
    return `<div class="header"><h1>Question ${question.number}</h1><h1 id="timer"></h1>
    <button class="lobbystartbutton" onclick="continueQuestion()">Continue</button>
    <div class="headerplayercount"><h1 id="numberAnswers">${
      question.userAnswers ? question.userAnswers.length : 0
      }</h1><h6 class="mini">Answers</h6></div></div><h1 class="questiontitle ${examStyle ? "exam" : ""}">${(examStyle && question.exam) ? "[" + question.exam + "]<br>" : ""}${
      question.question.replace(/\n/g, "<br>")
      }${examStyle ? answerBoxes : ""}</h1><p class="questiondescription">${
      question.description ? question.description.replace(/\n/g, "<br>") : ""
      }</p><div class="answers host">${examStyle ? "" : answerBoxes}</div>`;
  },
  scoreboard: function (question) {
    let leaderboard = "";
    question.leaderboard.forEach(function (player, i) {
      if (player.type == 0 && player.score > 0) {
        if (i > 4) {
          return;
        }
        leaderboard += `<h5>${player.name} <span>${player.score}</span></h5>`
      }
    })
    return /*html*/ `<div class="header"><h1>Scoreboard</h1><button onclick="lobbyContinue()">Continue</button></div><h3>${question.fact ? question.fact : ""}</h3><div class="leaderboard">${leaderboard}</div>`
  },
  waitingForAnswers: function () {
    clearInterval(currentTimer);
    return /*html*/ `<div class="row">
    <div class="center-box center-block"><div class="lds-ring"><div></div><div></div><div></div><div></div></div><h1>Waiting</h1></div></div>`
  },
  correctanswer: function (score) {
    changeBackgroundColour("body-green");
    clearInterval(currentTimer);
    return /*html*/ `<div class="row">
    <div class="center-box center-block"><h1>Correct</h1><p>You now have ${score} points</p></div></div>`
  },
  incorrectanswer: function (score) {
    changeBackgroundColour("body-red");
    clearInterval(currentTimer);
    return /*html*/ `<div class="row">
    <div class="center-box center-block"><h1>Incorrect</h1><p>You still have ${score} points</p></div></div>`
  },
};

let intervalsToClear = [];

/**
 * Displays a "scene" on the client
 * @param {String} tag The name of the scene
 * @param {*} data Any data to be given to the scene
 */
function loadScene(tag, data) {
  changeBackgroundColour("body-blue")
  try {
    $("#scene").html(scenes[tag](data));
    if(timeoutsToClear.length > 0){
      timeoutsToClear.forEach(function(timeout){
        clearTimeout(timeout);
      })
    }
    if(intervalsToClear.length > 0){
      intervalsToClear.forEach(function(interval){
        clearInterval(interval);
      })
    }
    if (tag == "signin") {
      if (gapi) {
        gapi.signin2.render("g-signin", {
          scope: "profile email https://www.googleapis.com/auth/classroom.courses.readonly",
          onsuccess: onSignIn
        });
      }
    }
    if (tag == "teacherlobby") {
      gapi.sharetoclassroom.render("classroom-share", {
        theme: "light",
        size: 70
      })
    }
  } catch (e) { }
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

function changeBackgroundColour(c){
  let r = "";
  let a = "";
  colours.forEach((colour)=>{
    if(colour == c){
      a += " " + colour;
    }
    else{
      r += " " + colour;
    }
  })
  if(a == ""){
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
      console.log("Adding class to correct answer")
      let t = setTimeout(() => $("#answer-" + answer).addClass("animated bounce"), 5000 + (300 * i));
      timeoutsToClear.push(t);
    }
    else {
      let t = setTimeout(() => $("#answer-" + answer).addClass("animated slideOutLeft").one("animationend", function() {
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

function dropQuestion(){
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