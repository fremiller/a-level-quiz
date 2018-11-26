/**
 * Student lobbys scene
 * @extends Scene
 */
class StudentLobby extends Scene {
    generateHtml(data) {
        return html`
<div class="slobby">
    <div class="lds-ring">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
    </div>
    <h3>Connected</h3>
    <h5>Go fullscreen for the best experience</h5><button onclick="toggleFullscreen()">Fullscreen</button>
</div>`;
    }
}