class StudentDashboard extends Scene {
    generateHtml(data) {
        getRunningGames()
        setInterval(getRunningGames, 5000);
        return html`<div class="header"><h1>Dashboard</h1><div class="headeruserdetails"><img src="${
            currentUser.profileImage
            }"><div><h5>${currentUser.name}</h5><h6>${
            currentUser.domain
            }</h6></div></div></div>
        <div id="joinGames">

        </div>
      </div>`;
        return;
    }
}