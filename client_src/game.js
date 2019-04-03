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
    loadScene("loading", {text: "Connecting to game"})
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
}