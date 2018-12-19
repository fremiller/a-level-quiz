/**
 * Administrator dashboard
 * @extends Scene
 */
class AdminDashboard extends Scene {
    preRender(data) {
        this.stateInterval = setInterval(adminStateDisplay, 1000);
    }
    /**
     * @inheritdoc
     * @param {undefined} data 
     */
    generateHtml(data) {
        return html `
<div class="header">
    <h1>Dashboard</h1>
    <div class="headeruserdetails"><img src="${
            currentUser.profileImage
            }">
    </div>
    
</div><div id="adminstatus" class="status"></div>
    <div class="adminrow">
    <div id="adminconsole" class="console">

    </div>
    <div id="runningGamesList" class="datalist" data-list-title="Running Games"></div>
    </div>
    <button class="bigbtn" onclick="createQuestion()">Create Question</button>`
    }
}