class IncorrectAnswer extends Scene {
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