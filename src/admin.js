/**
 * Contains Admin class
 * @module src/admin
 */

let {Module} = require("module");
let {GameManager} = require("./gamemanager.js");
let pm2 = require("pm2");

exports.Admin = class Admin extends Module{
    constructor(){
        super("Admin");
        Admin.singleton = this;
        this.log = "";
        pm2.connect(function(err){
            if(err){
                console.error(err);
            }
            pm2.launchBus((err, bus)=>{
                bus.on("log:out", data=>{
                    Admin.singleton.log += data.data;
                })
            });
        })
    }

    getRunningGames(){
        let games = [];
        for (var key in GameManager.singleton.games) {
            // check if the property/key is defined in the object itself, not in parent
            if (dictionary.hasOwnProperty(key)) {           
                let g = dictionary[key];
                games.push({
                    id: key,
                    players: g.players.length,
                    status: g.state,
                })
            }
        }
        return games;
    }
}