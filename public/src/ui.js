let scenes = {
    "signin": function (data) {
        return `<div class="row">
    <div class="center-box center-block "><h1>Quiz</h1>
            <p>orleanspark.school emails only</p>
            <div id="google-align">
                <div id="g-signin" class="g-signin2" data-onsuccess="onSignIn" data-theme="dark" style="display: block; margin: 0 auto;"></div>
            </div></div>
</div>`;
    },
    "error": function (data) {
        return `<div class="row">
    <div class="center-box center-block "><h1>Error ${data.status}</h1>
        <p>${data.text}</p>
        <p>Reload the page to try again</p></div>
    </div>`

    },
    "loading": function (data) {
        return `<div class="row">
            <div class="center-box center-block "><h1>Loading</h1><p>${(data.text) ? data.text : ""}</p><div class="progress">
            <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" style="width: 100%"></div></div>
            </div>
            </div>`
    },
    "studentdashboard": function (data) {
        return `<div class="header"><h1>Dashboard</h1><div class="headeruserdetails"><img src="${currentUser.profileImage}"><div><h5>${currentUser.name}</h5><h6>${currentUser.domain}</h6></div></div></div><div class="input-group mb-3">
        <input type="number"id="codeinput" class="form-control" placeholder="Code" aria-label="Code" aria-describedby="joingamebutton">
        <div class="input-group-append">
          <button class="btn btn-outline-secondary" type="button" id="joingamebutton" onclick="joingame()">Join</button>
        </div>
      </div></div>`
    },
    "teacherdashboard": function (data) {
        return `<div class="header"><h1>Dashboard</h1><div class="headeruserdetails"><img src="${currentUser.profileImage}"><div><h5>${currentUser.name}</h5><h6>${currentUser.domain}</h6></div></div></div><button class="bigbtn" onclick="creategame()">Create Game</button>`
    },
    "teacherlobby": function (data) {
        let playerlist = "";
        for (let i = 0; i < currentGame.players.length; i++) {
            playerlist += `<p>${currentGame.players[i].name}</p>`
        }
        return `<div class="header"><h1 class="code">${currentGame.code}</h1><button class="lobbystartbutton" onclick="startgame()">Start Game</button><div class="headerplayercount"><h1>${currentGame.players.length}</h1><h6 class="mini">Players</h6></div></div><div id="players">${playerlist}</div>`
    },
    "studentlobby": function (data) {
        return `<h1>Waiting for game to start</h1>`
    },
    "studentquestion": function (question) {
        let answerBoxes = "";
        question.answers.forEach(answer => {
            answerBoxes += `<div class="answer">${answer}</div>`;
        });
        return `<div class="answers">${answerBoxes}</div>`
    },
    "teacherquestion": function (question) {
        console.log(question)
        let answerBoxes = "";
        question.answers.forEach(answer => {
            answerBoxes += `<div class="answer">${answer}</div>`;
        });
        return `<h1 class="questiontitle">${question.question}</h1><p class="questiondescription">${question.description}</p><div class="answers">${answerBoxes}</div>`
    }
}
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
        }); let playerlist = document.getElementById("players");
        for (let i = 0; i < currentGame.players.length; i++) {
            playerlist.innerHTML += `<p>${currentGame.players[i].name}</p>`
        }
    }
}

/**
 * Displays an error on the page
 * @param {{"err": String, "text": String}} err 
 */
function showError(err) {
    loadScene("error", { status: err.statusCode, text: err.responseText });
}

$(function () {
    loadScene("signin");
    $(function () {
        $('[data-toggle="tooltip"]').tooltip()
    })
})
