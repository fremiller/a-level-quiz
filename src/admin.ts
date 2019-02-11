import { Game } from "./game";

/**
 * Contains Admin class
 * @module src/admin
 */

let { Module } = require("module");
let { GameManager } = require("./gamemanager.js");
let Auth = require("./auth");
let clogold = console.log;

export class Admin extends Module {
    static singleton: Admin;

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
            if (GameManager.singleton.games.hasOwnProperty(key)) {
                let g: Game = GameManager.singleton.games[key];
                let state = g.state;
                let id = g.classid
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
        let TA = [];
        Auth.testAccounts.forEach((acc)=>{
            let E = {
                domain: acc.domain,
                googleid: acc.googleid,
                name: acc.name,
                profileImage: acc.profileImage,
                userType: acc.userType
            };
            TA.push(E);
        })
        return TA
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

    makeTestAccount(isTeacher: boolean){
        console.log(`Creating ${isTeacher?"teacher":"student"} account`);
        Auth.generateTestAccount(isTeacher);
    }

    deleteTestAccount(index: number){
        console.log(`Deleting test account ${index}`);
        Auth.deleteTestAccount(index);
    }
}
