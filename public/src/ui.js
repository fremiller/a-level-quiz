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
        <p>Reload the page to try again</p></div>
    </div>`;
  },
  loading: function (data) {
    return /*html*/ `<div class="row">
            <div class="center-box center-block "><h1>Loading</h1><p>${
              data.text ? data.text : ""
            }</p><div class="progress">
            <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" style="width: 100%"></div></div>
            </div>
            </div>`;
  },
  createGame: function (data) {
    let classSelect = ""
    currentUser.classes.forEach(function (clas) {
      classSelect += `<option value=${clas.id}>${clas.name}</option>`
    })
    return /*html*/ `<div class="row"><div class="center-box center-block"><h1>Create game</h1><form><div class="form-group">
    <label for="topic">Topic</label>
    <select class="form-control" id="topic">
      <option>Electric Fields</option>
      <option>Magnetic Fields</option>
      <option>All</option>
      <option>Auto</option>
    </select>
  </div>
  <div class="form-group">
    <label for="classs">Class</label>
    <select class="form-control" id="class">
      ${classSelect}
    </select>
  </div>
  <div class="form-group">
    <label for="testselect">Gamemode</label>
    <select class="form-control" id="testselect">
    <option>Quiz</option>
      <option>Test</option>
    </select>
  </div>
  <button class="bigbtn" onclick="creategamesubmit()">Start</button></form></div></div>`
  },
  studentdashboard: function (data) {
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
    return /*html*/ `<div class="header"><button class="lobbystartbutton" onclick="startgame()" ${(currentGame.players.length == 1)?"disabled":""}>Start Game</button>${currentGame?`<!--<div id="classroom-share" class="g-sharetoclassroom" data-title="Physics Quiz" data-body="Join the Quiz using the link here" data-url="http://localhost:8000/?gameCode="+currentGame.code></div>-->`:""}<h1>Play at <span id="link"> ffsh.xyz</span></h1><div class="headerplayercount"><h1>${
      currentGame.players.length - 1
    }</h1><h6 class="mini">Players</h6></div></div><div id="players">${playerlist}</div>`;
  },
  studentlobby: function (data) {
    return /*html*/ `<div class="slobby"><div class="lds-ring"><div></div><div></div><div></div><div></div></div><h3>Connected</h3><h5>Get ready</h5></div>`;
  },
  studentquestion: function (question) {
    let answerBoxes = "";
    startTimer(question.timeLimit)
    question.answers.forEach((answer, i) => {
      answerBoxes += `<div id="answer-${i}" class="answer" onclick="submitAnswer(${i})"><div><div>${answer}</div></div></div>`;
    });
    return /*html*/ `<div class="header questionheader"><h1>Question ${question.number}</h1><h1 id="timer"></h1></div><div class="answers">${answerBoxes}</div>`;
  },
  teacherquestion: function (question) {
    console.log(question);
    startTimer(question.timeLimit)
    let answerBoxes = "";
    question.answers.forEach((answer, i) => {
      answerBoxes += `<div class="answer" id="answer-${i}"><div><div>${answer}</div></div></div>`;
    });
    return /*html*/ `<div class="header"><h1>Question ${question.number}</h1><h1 id="timer"></h1>
    <button class="lobbystartbutton" onclick="continueQ()">Continue</button>
    <div class="headerplayercount"><h1 id="numberAnswers">${
      question.userAnswers?question.userAnswers.length:0
    }</h1><h6 class="mini">Answers</h6></div></div><h1 class="questiontitle">${
      question.question.replace("/\n/g", "<br>")
    }</h1><p class="questiondescription">${
      question.description.replace(/\n/g, "<br>")
    }</p><div class="answers host">${answerBoxes}</div>`;
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
    return /*html*/ `<div class="header"><h1>Scoreboard</h1><button onclick="lobbyContinue()">Continue</button></div><h3>${question.fact?question.fact:""}</h3><div class="leaderboard">${leaderboard}</div>`
  },
  waitingForAnswers: function () {
    clearInterval(currentTimer);
    return /*html*/ `<h1>Waiting</h1>`
  },
  correctanswer: function (score) {
    clearInterval(currentTimer);
    return /*html*/ `<h1>Correct</h1><p>You now have ${score} points</p>`
  },
  incorrectanswer: function (score) {
    clearInterval(currentTimer);
    return /*html*/ `<h1>Incorrect</h1><p>You still have ${score} points</p>`
  },
};
/**
 * Displays a "scene" on the client
 * @param {String} tag The name of the scene
 * @param {*} data Any data to be given to the scene
 */
function loadScene(tag, data) {
  $("#scene").html(scenes[tag](data));
  if (tag == "signin") {
    gapi.signin2.render("g-signin", {
      scope: "profile email https://www.googleapis.com/auth/classroom.courses.readonly",
      onsuccess: onSignIn
    });
    let playerlist = document.getElementById("players");
    for (let i = 0; i < currentGame.players.length; i++) {
      if (currentGame.players[i].type == 0) {
        playerlist.innerHTML += `<p>${currentGame.players[i].name}</p>`;
      }
    }
  }
  if (tag == "teacherlobby") {
    gapi.sharetoclassroom.render("classroom-share", {
      theme: "light",
      size: 70
    })
  }
}

/**
 * Displays an error on the page
 * @param {{"err": String, "text": String}} err
 */
function showError(err) {
  loadScene("error", {
    status: err.statusCode,
    text: err.responseText
  });
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

function showCorrectAnswer(answerid) {
  clearInterval(currentTimer);
  $(".answer").removeClass("answer").addClass("incorrectAnswer")
  $("#answer-" + answerid).removeClass("incorrectAnswer").addClass("correctAnswer")
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
  window.scrollTo(0,1);
  $(function () {
    $('[data-toggle="tooltip"]').tooltip();
  });
});

/* Get the documentElement (<html>) to display the page in fullscreen */
var elem = document.documentElement;

function toggleFullScreen() {
  var doc = window.document;
  var docEl = doc.documentElement;

  var requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
  var cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

  if(!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
    requestFullScreen.call(docEl);
  }
  else {
    cancelFullScreen.call(doc);
  }
}