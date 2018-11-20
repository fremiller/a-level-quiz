let html = String.raw;

class Scene {
    constructor(state, sceneId) {
        this.state = state;
        this.id = sceneId;
        this.currentHtml = "";
        this.save = false;
    }

    preRender(data) {
        if (intervalsToClear.length > 0) {
            intervalsToClear.forEach(function (interval) {
                clearInterval(interval);
            })
        }
    }

    generateHtml(data) {
        this.currentHtml = "<h1>Test</h1>"
        return this.currentHtml;
    }

    postRender(data) {

    }

    render(renderId, data) {
        this.generateHtml(data);
        $("#" + renderId).html(this.currentHtml);
    }
}

class SceneRenderer {
    constructor(renderId) {
        this.renderId = renderId;
    }

    render(scene, data) {
        new Scene.getSceneById(scene).render(this.renderId, data);
    }
}
