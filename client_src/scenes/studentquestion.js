/**
 * Student question - shows answer buttons
 * @extends Scene
 */
class StudentQuestion extends Scene {
    generateHtml(question) {
        let timeOffset = question.time - new Date().getTime();
        question.endTime += timeOffset;
        let answerBoxes = "";
        currentCountdownEnd = question.endTime
        let e = this
        e.data = question
        this.currentTimer = setInterval(()=>{
          let t = (currentCountdownEnd - new Date().getTime())/1000;
          $("#timer").html(t>0?Math.round(t):"")
          if (t < 0){
            clearInterval(e.currentTimer)
          }
        }, 200)
        question.answers.forEach((answer, i) => {
            answerBoxes += html`
<div id="answer-${i}" class="answer normal" onclick="submitAnswer(${i})">
    <div>
        <div>${answer}</div>
    </div>
</div>`;
        });
        return html`
<div class="header questionheader">
    <h1>Question ${question.number}</h1>
    <h1 id="timer">${Math.round((currentCountdownEnd - new Date().getTime())/1000)}</h1>
</div>
<div class="answers">${answerBoxes}</div>`;
    }
}