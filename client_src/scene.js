class Scene{
    static scenes = [];
    
    constructor(state, sceneId){
        this.state = state;
        this.id = sceneId;
        this.currentHtml = "";
        this.save = false;
    }

    static register(s){
        this.scenes.push(s);
    }

    static getSceneById(id){
        let sc = undefined;
        this.scenes.forEach((scene)=>{
            if(scene.id == id){
                sc = scene;
            }
        });
        return sc;
    }

    generateHtml(data){
        this.currentHtml =  "<h1>Test</h1>"
        return this.currentHtml;
    }

    render(renderId, data){
        this.generateHtml(data);
        $("#"+renderId).html(this.currentHtml);
    }
}

class SceneRenderer{
    constructor(renderId){
        this.renderId = renderId;
    }

    render(scene, data){
        new Scene.getSceneById(scene).render(this.renderId, data);
    }
}
