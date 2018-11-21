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
    loadScene("loading", {text: "Getting topics"})
    $.ajax({
        method: "GET",
        url: `/topics/list`,
        success: function(data){
            loadScene("createGame")
        }
    })
}

function getRunningGames(){
    $.ajax({
        method: "GET",
        url: "/games/user?id="+GOOGLE_TOKEN,
        success: function(data){
            showRunningGames(data.classesWithGames)
        }
    })
}

function creategamesubmit(){
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

function createQuestion(){
    loadScene("createquestion");
}
