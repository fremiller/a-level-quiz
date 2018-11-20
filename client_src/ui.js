let tick = `<svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52"><circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/><path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/></svg>`
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