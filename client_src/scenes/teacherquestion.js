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
   * @param {number} data.endTime The time when the countdown ends
   * @param {String[]} data.answers The question's answers
   */
  generateHtml(data) {
    let timeOffset = data.time - new Date().getTime();
    data.endTime -= timeOffset;
    if (data.revealAnswers) {
      this.showCorrectAnswer(data.answerCounts, data.correctAnswer)
    }
    this.data = data;
    clearInterval(currentTimer);
    currentQuestion = data;
    currentCountdownEnd = data.endTime
    let e = this
    let last_t = Infinity;
    if (!data.revealAnswers) {
      this.currentTimer = setInterval(() => {
        let t = (currentCountdownEnd - new Date().getTime()) / 1000;
        let t_round = Math.round(t);
        $("#timer").html(t > 0 ? t_round : "")
        if (last_t > t_round && t <= 10) {
          last_t = t_round;
          e.displayCountdown(t_round);
        }
        if (t_round < 0) {
          e.hideCountdown()
        }
        if (t < 0) {
          clearInterval(e.currentTimer)
        }
      }, 200)
    }

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

    if (!data.revealAnswers) {
      this.bonus = 110;
    }
    let sceneInstance = this;
    this.bonusInterval = setInterval(() => {
      sceneInstance.bonus -= 1;
      if (sceneInstance.bonus > 0) {
        $("#bonus").html(Math.round(sceneInstance.bonus))
      }
      else {
        $("#bonus").hide();
      }
    }, (data.timeLimit / 100) * 1000)


    return html`
<div class="header">
<p id="countdown">5</p>
    <h1>Question ${data.number}</h1>
    <h1 id="bonus"></h1> 
    <h1 id="timer">${Math.round((currentCountdownEnd - new Date().getTime()) / 1000)}</h1>
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
        let t = setTimeout(() => $("#answer-" + answer).addClass("animated bounce"), (300 * i));
        timeoutsToClear.push(t);
      }
      else {
        let t = setTimeout(() => $("#answer-" + answer).addClass("animated slideOutLeft").one("animationend", function () {
          $(this).removeClass('animated slideOutLeft');
          $(this).html("&zwnj;<span class='bold'>&zwnj;</span>");
          revealAnswersToPlayers();
        }), (300 * i));
        timeoutsToClear.push(t);
      }
    })
    clearInterval(this.currentTimer);
  }
  /**
   * 
   * @param {Object} data Question data
   * @param {String} data.question Question title
   * @param {number[]} data.answerCounts Amount of answers to each question
   * @param {number} data.correctAnswer The correct answer to the question
   * @param {boolean} data.revealAnswers Whether the answer should be revealed
   * @param {number} data.studentAnswerCount The amount of answers recieved
   * @param {number} data.timeLimit The amount of time to count down for
   * @param {number} data.endTime The time when the countdown ends
   * @param {String[]} data.answers The question's answers
   */
  redraw(data){
    if(data.revealAnswers != this.data.revealAnswers){
      // If it needs to reveal answers, redraw the scene entirely
      return false;
    }
    $("#numberAnswers").html(data.studentAnswerCount);
    this.data = data;
    return true;
  }

  displayCountdown(number) {
    $("#countdown").show();
    $("#countdown").removeClass("animated heartBeat fast");
    void document.getElementById("countdown").offsetWidth
    $("#countdown").html(number)
    $("#countdown").addClass("animated heartBeat fast").one("animationend", function () {
      $(this).removeClass("animated heartBeat fast")
    })
  }

  hideCountdown() {
    $("#countdown").hide()
  }

  onLeave() {
    clearInterval(this.currentTimer)
    clearInterval(this.bonusInterval)
    return super.onLeave()
  }
}