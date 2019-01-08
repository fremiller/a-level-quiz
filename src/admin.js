/**
 * Contains Admin class
 * @module src/admin
 */

let { Module } = require("module");
let { GameManager } = require("./gamemanager.js");
let Auth = require("./auth");
let clogold = console.log;

exports.Admin = class Admin extends Module {
    constructor() {
        super("Admin");
        Admin.singleton = this;
        this.log = "";
        
        console.log = (message)=>{
            Admin.singleton.log += message + "\r\n";
            clogold(message);
        }
    }

    getRunningGames() {
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

    getTestAccounts(){
        return Auth.testAccounts
    }

    getAdminState(){
        return {
            "console": this.log,
            "status": "Online",
            "users": 1000,
            "games": this.getRunningGames(),
            "testAccounts": this.getTestAccounts()
        }
    }

    makeTestAccount(isTeacher){
        Auth.generateTestAccount(isTeacher);
    }
}