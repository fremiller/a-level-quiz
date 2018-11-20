class WaitingForAnswers extends Scene {
    generateHtml(data) {
        clearInterval(currentTimer);
        return html`
<div class="row">
    <div class="center-box center-block">
        <div class="lds-ring">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
        </div>
        <h1>Waiting</h1>
    </div>
</div>`
    }
}