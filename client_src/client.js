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

function openGameInfo(classId, timestamp, teacher) {
    loadScene("loading", { text: "Getting game info" })
    loadGameInfo(classId, timestamp, teacher);
}

function loadGameInfo(classId, timestamp, teacher) {
    if (teacher) {
        loadScene("statistics", {
            download: true,
            downloadURL: `/games/data/teacher?token=${GOOGLE_TOKEN}&classId=${classId}&timestamp=${timestamp}`,
            dataType: "teachergame"
        })
    }
    else{
        loadScene("statistics", {
            download: true,
            downloadURL: `/games/data/student?token=${GOOGLE_TOKEN}&classId=${classId}&timestamp=${timestamp}`,
            dataType: "teachergame"
        })
    }
}

function openUserProfile(id){
    loadScene("statistics", {
        download: true,
        downloadURL: `/games/me/?token=${GOOGLE_TOKEN}&id=${id}`,
        dataType: "studentprofile"
    })
}
