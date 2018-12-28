/**
 * Scene is shown once the game has finished
 * @extends Scene
 */
class Finish extends Scene {
    generateHtml(data) {
        return html`
        <div class="row">
            <div class="center-box center-block animated slideInUp">
                <h3>Thanks for playing</h3>
                <p>How would you rate this game?</p>
                <div class="feedbackButtons">
                    <div><p>1</p></div>
                    <div><p>2</p></div>
                    <div><p>3</p></div>
                    <div><p>4</p></div>
                    <div><p>5</p></div>
                </div>
                <p>Do you have any feedback?</p>
                <textarea></textarea>
            </div>
        </div>`;
    }
}