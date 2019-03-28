import { Game } from "./game";
import { IUser } from "./models";

/**
 * Contains Admin class
 * @module src/admin
 */

let { Module } = require("module");
let { GameManager } = require("./gamemanager.js");
let Auth = require("./auth");
let clogold = console.log;

interface RunningGame{
    state: string,
    id: string,
    players: number
}

export class Admin extends Module {
    static singleton: Admin;

    constructor() {
        super("Admin");
        Admin.singleton = this;
        this.log = "";
        // Override the console.log function to add the string to the admin logs
        console.log = (message)=>{
            Admin.singleton.log += message + "\r\n";
                clogold(message);
        }
    }

    /**
     * Returns a list of currently running games
     */
    getRunningGames(): RunningGame[] {
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

    /**
     * Returns a list of test accounts.
     */
    getTestAccounts(): IUser[]{
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

    /**
     * Called from the admin state http request.
     * Returns current application status
     */
    getAdminState(){
        return {
            "console": this.log,
            "status": "Online",
            "users": 1000,
            "games": this.getRunningGames(),
            "testAccounts": this.getTestAccounts()
        }
    }

    /**
     * Creates a test account
     * @param isTeacher Whether to create a teacher or a student
     */
    makeTestAccount(isTeacher: boolean){
        console.log(`Creating ${isTeacher?"teacher":"student"} account`);
        Auth.generateTestAccount(isTeacher);
    }

    /**
     * Deletes a test account
     * @param index Which test account to delete
     */
    deleteTestAccount(index: number){
        console.log(`Deleting test account ${index}`);
        Auth.deleteTestAccount(index);
    }
}
