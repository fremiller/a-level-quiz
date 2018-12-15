class TeacherGameInfo extends Scene{
    generateHtml(gameInfo){
        console.log(gameInfo)
        let sc = "";
        gameInfo.players.forEach((p, i)=>{
            if(i > 0){
                sc += html`<div class="hline"></div>`
            }
            sc += html`<div><h3>${int_to_pos(i)}</h3><h3>${p.details.name}</h3></div>`
        })
        return html`<div class="header">
            <h1>Game info</h1>
        </div>
        <div class="infoscoreboard">
            ${sc}
        </div>`
    }
}