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