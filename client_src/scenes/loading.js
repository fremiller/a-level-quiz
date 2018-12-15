/**
 * Scene is shown when loading
 * @extends Scene
 */
class LoadingScene extends Scene {
    /**
     * 
     * @param {Object} data
     * @param {string} data.text The text to display while loading
     */
    generateHtml(data) {
        return html`
        <div class="row">
            <div class="center-box center-block animated slideInUp">
                <div class="lds-ring">
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                </div>
                <h1>Loading</h1>
                <p>${
                  data.text ? data.text : ""
                  }</p>
            </div>
        </div>`;
    }
}