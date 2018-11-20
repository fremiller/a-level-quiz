class LoadingScene extends Scene{
    generateHtml(data){
        return html`<div class="row">
            <div class="center-box center-block"><div class="lds-ring"><div></div><div></div><div></div><div></div></div><h1>Loading</h1><p>${
      data.text ? data.text : ""
      }</p>
            </div>
            </div></div>`;
    }
}