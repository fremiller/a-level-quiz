class TeacherSummary extends Scene{
    /**
     * Generates HTML for the TeacherSummary scene
     * @param {Object} data TeacherSummary data
     * @param {Object[]} data.leaderboard
     * @param {String} data.leaderboard.name
     * @param {Number} data.leaderboard.score
     * @param {Number} data.numberOfQuestions
     */
    generateHtml(data){
        let lbhtml = data.leaderboard.map((item)=>{return html`<h3>${item.name}<span>${item.score}</span></h3>`})
        return html`<div class="header">
            <h1>Summary</h1><p>${data.numberOfQuestions} Questions</p>
            <button class="lobbystartbutton" onclick="loadScene('teacherdashboard')">Continue</button>
            </div>
        ${lbhtml}`
    }
}