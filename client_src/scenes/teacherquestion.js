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
        if(data.revealAnswers){
            this.showCorrectAnswer(data.answerCounts, data.correctAnswer)
        }
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

    showCorrectAnswer(counts, correctAnswer) {
        let revealLast = 0;
        let revealRandom = [];
        counts.forEach(function (count, i) {
          let ht = $("#answer-" + i).html()
          $("#answer-" + i).html(ht + `<span class="answerCount"> ${toString(count)}</span>`);
          if (i == correctAnswer) {
            revealLast = i;
          }
          else {
            revealRandom.push(i);
          }
        })
        let revealQueue = shuffle(revealRandom);
        revealQueue.push(revealLast);
        revealQueue.forEach((answer, i) => {
          let ht = $("#answer-" + answer).html()
          if (i == counts.length - 1) {
            // This is the last (the correct) answer
            let t = setTimeout(() => $("#answer-" + answer).addClass("animated bounce"), 5000 + (300 * i));
            timeoutsToClear.push(t);
          }
          else {
            let t = setTimeout(() => $("#answer-" + answer).addClass("animated slideOutLeft").one("animationend", function () {
              $(this).removeClass('animated slideOutLeft');
              $(this).html("&zwnj;<span class='bold'>&zwnj;</span>");
              revealAnswersToPlayers();
              //if (typeof callback === 'function') callback();
            }), 5000 + (300 * i));
            timeoutsToClear.push(t);
          }
        })
        clearInterval(currentTimer);
      }
}