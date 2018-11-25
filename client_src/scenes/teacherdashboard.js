class TeacherDashboard extends Scene {
    generateHtml(data) {
        return html`
<div class="header">
    <h1>Dashboard</h1>
    <div class="headeruserdetails"><img src="${
            currentUser.profileImage
            }">
        <div>
            <h5>${currentUser.name}</h5>
            <h6>${
                currentUser.domain
                }</h6>
        </div>
    </div>
</div><button class="bigbtn" onclick="creategame()">Create Game</button>
<div id="pastGames">Loading past games...</div>`;
    }
    postRender(){
        getUserPastGames().then(function(games){
            let pgBox = "";
            games.forEach(g => {
                let className = "";
                currentUser.classes.forEach((clas)=>{
                    if(clas.id == g.classId){
                        className = clas.name;
                    }
                })
                let date = new Date(Number.parseInt(g.timestamp));
                pgBox += html`<div class="gamejoin"><h5>${className}</h5><h6>${date.getDate()}/${date.getMonth()}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}</h6></div>`
            });
            $("#pastGames").html(pgBox);
        });
    }
}