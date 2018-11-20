class StudentQuestion extends Scene{
    generateHtml(data){
        clearInterval(currentTimer);
    let answerBoxes = "";
    startTimer(question.timeLimit)
    question.answers.forEach((answer, i) => {
      answerBoxes += html`<div id="answer-${i}" class="answer normal" onclick="submitAnswer(${i})"><div><div>${answer}</div></div></div>`;
    });
    return html`<div class="header questionheader"><h1>Question ${question.number}</h1><h1 id="timer"></h1></div><div class="answers">${answerBoxes}</div>`;
    }
}