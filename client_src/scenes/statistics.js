/**
 * @typedef {Object} StatisticsData
 * @property {boolean} download
 * @property {string} downloadURL
 * @property {Object} data
 * @property {string} params
 * @property {"teachergame"|"teacherquestion"|"studentprofile"} dataType
 */

 /**
 * @typedef {Object} UserGameStatsData
 * 
 * This is a structure used in the User and GameStats object
 * to store the performance of one user in one game.
 *
 * @property {string} gameId - The ID of the game which can be used to find other players in the game
 * @property {string} timeStamp - The time when the game finished
 * @property {number} score - The score that the user got
 * @property {number} position - What position the player came in the leaderboard
 * @property {string} userId - The ID of the user which can be used to get details of the user
 * @property {number[]} questions - Question answers
 * @property {string} classId The id of the user's class
 * @property {Object} details User information
 */

let currentGameData = undefined;

function reloadStats(datatype, params){
    loadScene("statistics", {
        params: params,
        download: false,
        data: currentGameData,
        dataType: datatype
    })
}

class Statistics extends Scene {
    /**
     * 
     * @param {StatisticsData} data 
     */
    async preRender(data) {
        this.downloadedData = data.data;
        this.returnable = true;
        this.renderData = {};
        let sceneInstance = this;
        if (data.download) {
            await new Promise(function (resolve, reject) {
                $.ajax({
                    method: "GET",
                    url: data.downloadURL,
                    success: function (downloadedData) {
                        sceneInstance.downloadedData = downloadedData;
                        resolve(downloadedData);
                    }
                })
            });
        }
        console.log("Data downloaded")
        if (!statsProcessData[data.dataType]){
            throw `Datatype ${data.dataType} not defined`
        }
        sceneInstance.renderData = statsProcessData[data.dataType](this.downloadedData, data.params);
        currentGameData = this.downloadedData;
        return
    }

    generateHtml(data) {
        if (!this.renderData){
            throw "No data processed to render."
        }
        console.log(this.renderData)
        let body = "";
        for (var key in this.renderData){
            console.log(key)
            let value = this.renderData[key];
            console.log(value)
            if (key == "title"){
                continue;
            }
            if (typeof value == "object"){
                console.log("Type object")
                // This is a list
                body += renderList(value, key);
            }
            else{
                console.log("Type value")
                // This is a normal key value pair
                body += renderAttribute(key, value)
            }
        }
        return html`<div class="header"><h1>${this.renderData.title}</h1></div>${body}`
    }

    postRender(data) {

    }
}

/**
 * This should process the data so that it can be rendered.
 */
const statsProcessData = {
    /**
     * This scene shows a summary of a game for a teacher
     * @param {Object} data Data to process
     * @param {String} data.timestamp
     * @param {UserGameStatsData[]} data.players
     * @param {QuestionData[]} data.questions
     * @returns {Object} Renderable data
     */
    "teachergame": function(data){
        console.log(data)
        let date = timestampToDate(data.timestamp);

        // Generate HTML for each player
        let playerList = [];
        data.players.forEach((p)=>{
            if(p.position == -1){
                // This is the teacher
                return;
            }
            playerList.push(html`<div><h3>${p.position+1}</h3><div class="vline"></div><h3>${p.details?p.details.name:p.userId}</h3></div>`)
        });

        // Generate HTML for each question
        let questionList = [];
        data.questions.forEach((q, qi)=>{
            let correctAnswer = q.correctAnswer;
            let correct = 0;
            let total = 0;
            data.players.forEach((p, i)=>{
                if(p.position == -1){
                    return
                }
                if(p.questions[qi] == correctAnswer){
                    correct++;
                }
                total ++;
            })
            let percentCorrect = Math.round(correct/total * 1000) / 10;
            questionList.push(html`<div class="clickable" onclick="reloadStats('teacherquestion', {questionIndex: ${qi}})"><h3 class="title">${q.question}</h3><div class="vline"></div><h3 class="${percentCorrect < 40?"bad":percentCorrect < 60?"okay":"good"}">${percentCorrect}%</h3></div>`)
        });
        return {
            title: "Game information",
            time: date,
            Players: playerList,
            Questions: questionList
        }
    },
    /**
     * This contains information about a question for an entire class
     * The question
     * The 4 answers
     * The percentage correct
     * The Players and their answers
     * @param {Object} data Data to process
     * @param {number} questionIndex
     * @param {String} data.timestamp
     * @param {UserGameStatsData[]} data.players
     * @param {QuestionData[]} data.questions
     * @param {Object} params
     * @param {number} questionIndex
     * @returns {Object} Renderable data
     */
    "teacherquestion": function(data, params){
        console.log(data)
        let question = data.questions[params.questionIndex];
        let questionTitle = question.question;
        let questionAnswer = question.answers.map((a)=>{return `<h3>${a}</h3>`})
        let students = [];
        let questionCorrectAnswer = question.correctAnswer;
        let totalCorrect = 0;
        let percentCorrect = 0;
        data.players.forEach((player, i)=>{
            if(player.position ==  -1){
                return;
            }
            let studentAnswer = player.questions[params.questionIndex]
            let studentCorrect = studentAnswer == questionCorrectAnswer;
            totalCorrect += studentCorrect?1:0
            console.log(studentCorrect?"Correct":"Incorrect");
            let studentName = player.details?player.details.name:player.userId;
            students.push(`<div><h3>${studentName}</h3><h3 class=${studentCorrect?"good":"bad"}>${studentAnswer}</h3></div>`)
        })
        percentCorrect = totalCorrect / (data.players.length - 1)
        return {
            title: `Question ${params.questionIndex}`,
            Question: questionTitle,
            Correct: percentCorrect,
            Answers: questionAnswer,
            Students: students
        }
    },
    "studentprofile": function(data, params){
        console.log(data)
        let gamesList = [];
        let games = data.games;
        let name = data.userinfo.name;
        games.forEach(g => {
            let className = "";
            currentUser.classes.forEach((clas) => {
                if (clas.id == g.classId) {
                    className = clas.name;
                }
            })
            let date = new Date(Number.parseInt(g.timestamp));
        gamesList.push(html`<div class="gamejoin" onclick="openGameInfo('${g.classId}', '${g.timestamp}', true)">
            <!-- <h3 class="gold">1<sup>st</sup></h3> -->
<div><h5>${className}</h5>
<h6>${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}</h6></div>
<sup>&nbsp;</sup><h3 class="totip" data-main="6.4.3" data-topic="Electric Fields"><sup>&nbsp;</sup></h3></h3><div class="vline"></div><h3 class="good">86%<sup>&nbsp;</sup></h3>
</div>`)
        })
        return {
            title: name,
            "Past Games": gamesList
        }
    }
}

/**
 * Turns a timestamp string into a date.
 * Format DD/MM/YYYY
 * @param {string} timestamp The timestamp to turn into a date
 * @returns {string} date The date in DD/MM/YYYY
 */
function timestampToDate(timestamp){
    let date = new Date(Number.parseInt(timestamp));
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}`
}

/**
 * Puts a list of strings into a list HTML element
 * @param {String[]} elements List of elements to display
 */
function renderList(elements, title){
    let listBody = "";
    elements.forEach((e, i)=>{
        if (i > 0){
            // Put in a seperator
            listBody += html`<div class="hline"></div>`;
        }
        listBody += e
    })
    return html`<div class="datalist" data-list-title="${title}">${listBody}</div>`
}

/**
 * Renders a key and value to html
 * @param {string} key The key to render
 * @param {string|number} value The value to render
 * @returns {string} HTML key and value
 */
function renderAttribute(key, value){
    return html`<div class="dataattribute"><span class="key">${key}</span>${value}</div>`
}