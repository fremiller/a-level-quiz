/**
 * Scene is shown if the client's answer is incorrect
 * @extends Scene
 */
class IncorrectAnswer extends Scene {
    /**
     * @inheritdoc
     * @param {number} score The player's score 
     */
    generateHtml(score) {
        changeBackgroundColour("body-red");
        clearInterval(currentTimer);
        return html`
<div class="row">
    <div class="center-box center-block">
        <h1>Incorrect</h1>
        <p>You still have ${score} points</p>
    </div>
</div>`
    }
}