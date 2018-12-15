exports.config = class{
    constructor(configFile){
        let f = require(configFile);
        if(!f){
            console.error(`Config file ${configFile} not found...`)
        }
        this.config = f;
    }
}