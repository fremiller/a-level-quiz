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
            <div class="gitstatus">
                <p><span>1231542</span> by fishfred</p>
                <h3>Added git status</h3>
                <div class="pullbutton">Pull</div>
            </div>
    <div class="adminrow">
    <div id="adminconsole" class="console">

    </div>
    <div id="runningGamesList" class="datalist" data-list-title="Running Games"></div>
    </div>
    <div id="testAccountList" class="datalist" data-list-title="Test Accounts"></div>
    <button class="bigbtn" onclick="createQuestion()">Create Question</button>`
    }

    onLeave(){
        clearInterval(this.stateInterval);
        return new Promise(function(res){
            res();
        })
    }
}