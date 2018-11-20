class CreateGameScene extends Scene {
    generateHtml(data) {
        let classSelect = ""
        currentUser.classes.forEach(function (clas) {
            classSelect += `<option value=${clas.id}>${clas.name}</option>`
        })
        return html`<div class="row"><div class="center-box center-block"><h1>Create game</h1><form>
            <label for="topic">Topic</label>
            <select class="form-control" id="topic">
              <option>Electric Fields</option>
              <option>Magnetic Fields</option>
              <option>All</option>
              <option>Auto</option>
            </select>
        
            <label for="classs">Class</label>
            <select class="form-control" id="class">
              ${classSelect}
            </select>
        
            <label for="testselect">Gamemode</label>
            <select class="form-control" id="testselect">
            <option>Quiz</option>
              <option>Test</option>
            </select>
        </form>
          <button class="bigbtn" onclick="creategamesubmit()">Start</button></div></div>`
    }
}