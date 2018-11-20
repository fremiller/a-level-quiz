class TeacherLobby extends Scene{
    generateHtml(data){
        let playerlist = "";
    for (let i = 0; i < currentGame.players.length; i++) {
      if (currentGame.players[i].type == 0) {
        playerlist += `<p>${currentGame.players[i].name}</p>`;
      }
    }
    return html`<div class="header"><button class="lobbystartbutton" onclick="startgame()" ${(currentGame.players.length == 1) ? "" : ""}>Start Game</button>${currentGame ? `<!--<div id="classroom-share" class="g-sharetoclassroom" data-title="Physics Quiz" data-body="Join the Quiz using the link here" data-url="http://localhost:8000/?gameCode="+currentGame.code></div>-->` : ""}<h1>Play at <span id="link"> ffsh.xyz</span></h1><div class="headerplayercount"><h1>${
      currentGame.players.length - 1
      }</h1><h6 class="mini">Players</h6></div></div><div id="players">${playerlist}</div>`;
    }
}