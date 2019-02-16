/**
 * Contains a sign in button and welcome text
 * @extends Scene
 */
class Privacy extends Scene {
    generateHtml(data) {
        return html`
<div class="row">
    <div class="center-box center-block animated slideInUp">
        <h1>Privacy</h1>
        <p>The only personally identifiable information we store is your full name (from your google account)</p>
        <p>We also store your profile picture and google account ID</p>
        <p>To access classes you're in, we query google APIs, access to which can be revoked at any time.</p>
        <p>All other data stored is game performance, which cannot be opted out of, as it is crucial to the function of the service</p>
    </div>
</div>`;
    }
}