/**
 * Contains a sign in button and welcome text
 * @extends Scene
 */
class SignIn extends Scene {
    generateHtml(data) {
        return html`
<div class="row">
    <div class="center-box center-block animated slideInUp">
        <h1>Quiz</h1>
        <p>orleanspark.school emails only</p>
        <div id="google-align">
            <div id="g-signin" class="g-signin2" data-onsuccess="onSignIn" data-theme="dark" style="display: block; margin: 0 auto;"></div>
        </div>
        <p><a onclick="loadScene('privacy')">Privacy</a></p>
    </div>
</div>`;
    }
    postRender(data) {
        const urlParams = new URLSearchParams(window.location.search);
        const testToken = urlParams.get('test');
        console.log(testToken)
        if (testToken) {
            onSignIn({
                isTest: true,
                token: testToken
            })
        }
        else {
            if (gapi) {
                gapi.signin2.render("g-signin", {
                    scope: "profile email https://www.googleapis.com/auth/classroom.courses.readonly",
                    onsuccess: onSignIn
                });
            }
        }
    }
}