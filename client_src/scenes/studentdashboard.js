/**
 * Student's dashboard
 * @extends Scene
 */
class StudentDashboard extends Scene {
    generateHtml(data) {
        this.returnable = true
        this.regenerateHtml = true
        getRunningGames()
        setInterval(getRunningGames, 5000);
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
</div>
<div id="joinGames">

</div>
</div>
<h3>Past games</h3>
<div id="pastGames">Loading past games...</div>`;
    }

    postRender() {
        getUserPastGames().then(function (data) {
            let games = data.games
            let pgBox = "";
            console.log(games);
            games.forEach(g => {
                let className = "";
                currentUser.classes.forEach((clas) => {
                    if (clas.id == g.classId) {
                        className = clas.name;
                    }
                })
                let date = new Date(Number.parseInt(g.timestamp));
            pgBox += html`<div class="gamejoin" onclick="openGameInfo('${g.classId}', '${g.timestamp}', false)">
                <!-- <h3 class="gold">1<sup>st</sup></h3> -->
    <div><h5>${className}</h5>
    <h6>${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}</h6></div>
    <sup>&nbsp;</sup><h3 class="totip" data-main="6.4.3" data-topic="Electric Fields"><sup>&nbsp;</sup></h3></h3><div class="vline"></div><h3 class="good">86%<sup>&nbsp;</sup></h3>
</div>`
            });
            $("#pastGames").html(pgBox);
        });
    }
}
