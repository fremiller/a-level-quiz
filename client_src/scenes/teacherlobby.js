/**
 * Scene contains player list and start button
 * @extends Scene
 */
class TeacherLobby extends Scene {
  /**
   * 
   * @param {Object} data
   * @param {String[]} data.players 
   */
  generateHtml(data) {
    console.log(data)
    let playerlist = "";
    for (let i = 0; i < data.players.length; i++) {
        playerlist += `<p>${data.players[i]}</p>`;
    }
    return html`
<div class="header"><button class="lobbystartbutton" onclick="next()">Start Game</button><h1>Play at <span id="link"> ffsh.xyz</span></h1>
  <div class="headerplayercount">
    <h1>${
      data.players.length
      }</h1>
    <h6 class="mini">Players</h6>
  </div>
</div>
<div id="players">${playerlist}</div>`;
  }
}