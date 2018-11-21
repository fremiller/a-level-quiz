class AdminDashboard extends Scene{
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