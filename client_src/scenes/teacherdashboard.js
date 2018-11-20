class TeacherDashboard extends Scene {
    generateHtml(data) {
        return html`<div class="header"><h1>Dashboard</h1><div class="headeruserdetails"><img src="${
            currentUser.profileImage
            }"><div><h5>${currentUser.name}</h5><h6>${
            currentUser.domain
            }</h6></div></div></div><button class="bigbtn" onclick="creategame()">Create Game</button>`;
    }
}