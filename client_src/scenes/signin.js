class SignIn extends Scene {
    generateHtml(data) {
        return html`<div class="row">
    <div class="center-box center-block ">
        <h1>Quiz</h1>
        <p>orleanspark.school emails only</p>
        <div id="google-align">
            <div id="g-signin" class="g-signin2" data-onsuccess="onSignIn" data-theme="dark" style="display: block; margin: 0 auto;"></div>
        </div>
    </div>
</div>`;
    }
    postRender(data) {
        if (gapi) {
            gapi.signin2.render("g-signin", {
                scope: "profile email https://www.googleapis.com/auth/classroom.courses.readonly",
                onsuccess: onSignIn
            });
        }
    }
}