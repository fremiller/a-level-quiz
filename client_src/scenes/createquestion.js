/**
 * Scene is shown to create a scene
 * @extends Scene
 */
class CreateQuestion extends Scene {
  /**
   * @inheritdoc
   * @param {undefined} data 
   */
  generateHtml(data) {
    return html `
        <div class="row">
  <div class="center-box">
    <h1>Create Question</h1>
    <form>
      <label for="topic">Topic</label>
      <input id="topic" type="text">
      <label for="question">Question</label>
      <h1 class="questiontitle exam inpoot">
        <input type="text">
        <br><br><span class="examAnswer" id="answer-0"><span class="bold">A</span> <input type="text"></span>
        <br><br><span class="examAnswer" id="answer-1"><span class="bold">B</span> <input type="text"></span>
        <br><br><span class="examAnswer" id="answer-2"><span class="bold">C</span> <input type="text"></span>
        <br><br><span class="examAnswer" id="answer-3"><span class="bold">D</span> <input type="text"></span>
      </h1>
      <label for="testselect">Gamemode</label>
      <select class="form-control" id="testselect">
        <option>Quiz</option>
        <option>Test</option>
      </select>
    </form>
    <button class="bigbtn" onclick="creategamesubmit()">Start</button>
  </div>
</div>`
  }
}