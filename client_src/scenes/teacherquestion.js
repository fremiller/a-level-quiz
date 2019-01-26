/**
 * Teacher question scene. Shows question and answer options
 * @extends Scene
 */
class TeacherQuestion extends Scene {
    /**
     * 
     * @param {Object} data Question data
     * @param {String} data.question Question title
     * @param {number[]} data.answerCounts Amount of answers to each question
     * @param {number} data.correctAnswer The correct answer to the question
     * @param {boolean} data.revealAnswers Whether the answer should be revealed
     * @param {number} data.studentAnswerCount The amount of answers recieved
     * @param {number} data.timeLimit The amount of time to count down for
     * @param {String[]} data.answers The question's answers
     */
    generateHtml(data) {
        clearInterval(currentTimer);
        currentQuestion = data;
        startTimer(data.timeLimit)
        let examStyle = true;
        let answerBoxes = "";
        data.exam = "";
        if (!examStyle) {
            data.answers.forEach((answer, i) => {
                answerBoxes += `<div class="answer normal" id="answer-${i}"><div><div>${answer}</div></div></div>`;
            });
        } else {
            data.answers.forEach((answer, i) => {
                answerBoxes += `<br><br><span class="examAnswer" id="answer-${i}"><span class="bold">${"ABCD"[i]}</span> ${answer}</span>`;
            });
        }
        return html`
<div class="header">
    <h1>Question ${data.number}</h1>
    <h1 id="timer"></h1>
    <button class="lobbystartbutton" onclick="next()">Continue</button>
    <div class="headerplayercount">
        <h1 id="numberAnswers">${
            data.studentAnswerCount
            }</h1>
        <h6 class="mini">Answers</h6>
    </div>
</div>
<h1 class="questiontitle ${examStyle ? " exam" : ""}">${(examStyle && data.exam) ? "[" + data.exam + "]<br>" : ""}${
            data.question.replace(/\n/g, "<br>")
            }${examStyle ? answerBoxes : ""}</h1>
<p class="questiondescription">${
            data.description ? data.description.replace(/\n/g, "<br>") : ""
            }</p>
<div class="answers host">${examStyle ? "" : answerBoxes}</div>`;
    }
}