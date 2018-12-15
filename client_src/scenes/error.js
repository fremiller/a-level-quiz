/**
 * Scene is shown when an error needs to be displayed
 * @extends Scene
 */
class ErrorScene extends Scene {
    /**
     * @param {Object} data 
     * @param {string} data.text The text of the error
     * @param {string} data.continue The scene to redirect to
     */
    generateHtml(data) {
        return html`
<div class="row">
    <div class="center-box center-block ">
        <h1>Error</h1>
        <p>${data.text}</p>
        ${(data.continue) ? `<button onclick="loadScene('${data.continue}')">Continue</button>` : `<p>Reload the page to
            try again</p>`}
    </div>
</div>`;
    }
}