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
    currentUser.classes.forEach(function(clas){
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
    // let classSelect = ""
    // currentUser.classes.forEach((clas)=>{
    //   classSelect += `<button onclick="connectToGame(${clas.id})">${clas.name}</button>`
    // })
    return /*html*/ `<div class="header"><h1>Dashboard</h1><div class="headeruserdetails"><img src="${
      currentUser.profileImage
    }"><div><h5>${currentUser.name}</h5><h6>${
      currentUser.domain
    }</h6></div></div></div><div class="input-group mb-3">
        <!-- <input type="number" id="codeinput" class="form-control" placeholder="Code" aria-label="Code" aria-describedby="joingamebutton">
        <div class="input-group-append">
          <button class="btn btn-outline-secondary" type="button" id="joingamebutton" onclick="joinGame()">Join</button>
        </div> -->
        <div id="joinGames">

        </div>
      </div></div>`;
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
      playerlist += `<p>${currentGame.players[i].name}</p>`;
    }
    return /*html*/ `<div class="header"><!--<h1 class="code">${
      currentGame.code
    }</h1>--><button class="lobbystartbutton" onclick="startgame()">Start Game</button>${currentGame?`<div id="classroom-share" class="g-sharetoclassroom" data-size="32" data-title="Physics Quiz" data-body="Join the Quiz using the link here" data-url="http://localhost:8000/?gameCode="+currentGame.code></div>`:""}<div class="headerplayercount"><h1>${
      currentGame.players.length
    }</h1><h6 class="mini">Players</h6></div></div><div id="players">${playerlist}</div>`;
  },
  studentlobby: function (data) {
    return /*html*/ `<h1>Waiting for game to start</h1>`;
  },
  studentquestion: function (question) {
    let answerBoxes = "";
    question.answers.forEach((answer, i) => {
      answerBoxes += `<div id="answer-${i}" class="answer" onclick="submitAnswer(${i})">${answer}</div>`;
    });
    return /*html*/ `<div class="answers">${answerBoxes}</div>`;
  },
  teacherquestion: function (question) {
    console.log(question);
    let answerBoxes = "";
    question.answers.forEach((answer, i) => {
      answerBoxes += `<div class="answer" id="answer-${i}">${answer}</div>`;
    });
    return /*html*/ `<div class="header"><h1>Question ${question.number}</h1>
    <button class="lobbystartbutton" onclick="continueQ()">Continue</button>
    <div class="headerplayercount"><h1 id="numberAnswers">${
      question.userAnswers?question.userAnswers.length:0
    }</h1><h6 class="mini">Answers</h6></div></div><h1 class="questiontitle">${
      question.question.replace("/\n/g", "<br>")
    }</h1><p class="questiondescription">${
      question.description.replace(/\n/g, "<br>")
    }</p><div class="answers">${answerBoxes}</div>`;
  },
  scoreboard: function (question) {
    let leaderboard = "";
    question.leaderboard.forEach(function (player, i) {
      if (i > 4) {
        return;
      }
      leaderboard += `<h5><strong>${i + 1}</strong> ${player.name} <span>${player.score}</span></h5>`
    })
    return /*html*/ `<h1>Scoreboard</h1><button onclick="lobbyContinue()" class="lobbystartbutton">Continue</button><h3>${question.fact?question.fact:""}</h3><div class="leaderboard">${leaderboard}</div>`
  },
  waitingForAnswers: function () {
    return /*html*/ `<h1>Waiting</h1>`
  },
  correctanswer: function (score) {
    return /*html*/ `<h1>Correct</h1><p>You now have ${score} points</p>`
  },
  incorrectanswer: function (score) {
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
      playerlist.innerHTML += `<p>${currentGame.players[i].name}</p>`;
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

function showRunningGames(games){
  let g = "";
  games.forEach((gam)=>{
    g += `<div class="gamejoin" onclick="connectToGame(${gam.id})"><h6>Found game</h6><h5>${gam.name}<h5></div>`
  })
  if(g == ""){
    g = "<h5>Searching for games...</h5>"
  }
  $("#joinGames").html(g);
}

function showCorrectAnswer(answerid) {
  $(".answer").removeClass("answer").addClass("incorrectAnswer")
  $("#answer-" + answerid).removeClass("incorrectAnswer").addClass("correctAnswer")
}

$(function () {
  loadScene("signin");
  $(function () {
    $('[data-toggle="tooltip"]').tooltip();
  });
});