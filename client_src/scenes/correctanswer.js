/**
 * Scene is shown if a student's answer is incorrect
 * @extends Scene
 */
class CorrectAnswer extends Scene {
    /**
     * @inheritdoc
     * @param {undefined} data 
     */
    generateHtml(score) {
        changeBackgroundColour("body-green");
        clearInterval(currentTimer);
        return html`
<div class="row">
    <div class="center-box center-block">
        <h1>Correct</h1>
        <p>You now have ${score} points</p>
    </div>
</div>`
    }
}