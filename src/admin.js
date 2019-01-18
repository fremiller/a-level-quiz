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
        for (var key in GameManager.singleton.games.none) {
            if (GameManager.singleton.games.none.hasOwnProperty(key)) {
                let g = GameManager.singleton.games.none[key];
                let state = g.state;
                let id = g.code
                let players = g.players.length;
                games.push({
                    id: id,
                    players: players,
                    status: state,
                });
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
        console.log(`Creating ${isTeacher?"teacher":"student"} account`);
        Auth.generateTestAccount(isTeacher);
    }

    deleteTestAccount(index){
        console.log(`Deleting test account ${index}`);
        Auth.deleteTestAccount(index);
    }
}
