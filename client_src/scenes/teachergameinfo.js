class TeacherGameInfo extends Scene{
    generateHtml(gameInfo){
        console.log(gameInfo)
        let date = new Date(Number.parseInt(gameInfo.timestamp));

        let sc = "";
        gameInfo.players.sort((a, b)=>{
            return a.position - b.position
        })
        gameInfo.players.forEach((p, i)=>{
            if (p.position == -1){
                // This is the teacher
                return
            }
            if(p.position > 0){
                sc += html`<div class="hline"></div>`
            }
            console.log(p)
            sc += html`<div><h3>${p.position+1}</h3><div class="vline"></div><h3>${p.details?p.details.name:p.userId}</h3></div>`
        })
        
        let ql = "";
        gameInfo.questions.forEach((q, qi)=>{
            let correctAnswer = q.correctAnswer;
            let correct = 0;
            let total = 0;
            gameInfo.players.forEach((p, i)=>{
                if(p.position == -1){
                    return
                }
                if(p.questions[qi] == correctAnswer){
                    correct++;
                }
                total ++;
            })
            let percentCorrect = Math.round(correct/total * 1000) / 10;
            ql += html`<div><h3 class="title">${q.question}</h3><div class="vline"></div><h3 class="${percentCorrect < 40?"bad":percentCorrect < 60?"okay":"good"}">${percentCorrect}%</h3></div>`
        });
        return html`<div class="header">
            <h1 onclick="loadScene('teacherdashboard')" class="back">Back</h1>
        </div>
        <div class="datalist" data-list-title="About">
        <div><h3>Time Played</h3><div class="vline"></div><h3>${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}</h3></div>
        <div><h3>Players</h3><div class="vline"></div><h3>${gameInfo.players.length}</h3></div>
        <div><h3>Number of questions</h3><div class="vline"></div><h3>${gameInfo.questions.length}</h3></div>
        </div>
        <div class="datalist" data-list-title="Students">
            ${sc}
        </div>
        <div class="datalist" data-list-title="Questions">
            ${ql}
        </div>`
    }
}