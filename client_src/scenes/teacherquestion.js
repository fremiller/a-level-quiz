class TeacherQuestion extends Scene {
    generateHtml(data) {
        clearInterval(currentTimer);
        currentQuestion = data;
        startTimer(data.timeLimit)
        let examStyle = data.type == "EXAM";
        let answerBoxes = "";
        if (!examStyle) {
            data.answers.forEach((answer, i) => {
                answerBoxes += `<div class="answer normal" id="answer-${i}"><div><div>${answer}</div></div></div>`;
            });
        } else {
            data.answers.forEach((answer, i) => {
                answerBoxes += `<br><br><span class="examAnswer" id="answer-${i}"><span class="bold">${"ABCD"[i]}</span> ${answer}</span>`;
            });
        }
        return html`<div class="header">
    <h1>Question ${data.number}</h1>
    <h1 id="timer"></h1>
    <button class="lobbystartbutton" onclick="continueQuestion()">Continue</button>
    <div class="headerplayercount">
        <h1 id="numberAnswers">${
            data.userAnswers ? data.userAnswers.length : 0
            }</h1>
        <h6 class="mini">Answers</h6>
    </div>
</div>
<h1 class="questiontitle ${examStyle ? " exam" : "" }">${(examStyle && data.exam) ? "[" + data.exam + "]<br>" : ""}${
    data.question.replace(/\n/g, "<br>")
    }${examStyle ? answerBoxes : ""}</h1>
<p class="questiondescription">${
    data.description ? data.description.replace(/\n/g, "<br>") : ""
    }</p>
<div class="answers host">${examStyle ? "" : answerBoxes}</div>`;
    }
}