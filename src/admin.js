let {Module} = require("module");
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
}