/**
 * Administrator dashboard
 * @extends Scene
 */
class AdminDashboard extends Scene{
    /**
     * @inheritdoc
     * @param {undefined} data 
     */
    generateHtml(data){
        return html`
<div class="header">
    <h1>Admin Dashboard</h1>
    <div class="headeruserdetails"><img src="${
            currentUser.profileImage
            }">
    </div>
</div><button class="bigbtn" onclick="createQuestion()">Create Question</button>`
    }
}
