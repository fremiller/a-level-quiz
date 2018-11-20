class ErrorScene extends Scene{
    generateHtml(data){
        return html`<div class="row">
    <div class="center-box center-block "><h1>Error ${data.status}</h1>
        <p>${data.text}</p>
        ${(data.continue)?`<button onclick="loadScene('${data.continue}')">Continue</button>`:`<p>Reload the page to try again</p>`}</div>
    </div>`;
    }
}