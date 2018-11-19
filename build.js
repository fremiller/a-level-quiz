let fs = require("fs");

async function run(){
    let files = await fs.readdirSync(__dirname + "/client_src");
    let text = "";
    await files.forEach(async function(file) {
        let name = __dirname + "/client_src/" + file;
        console.log(name);
        let t = await fs.readFileSync(name, {encoding: "utf-8"});
        text += t;
    });
    await fs.writeFileSync(__dirname + "/public/main.js", text);
    console.log("done")
}

run();