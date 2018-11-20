let fs = require("fs");

async function run(){
    let files = await fs.readdirSync(__dirname + "/client_src");
    let text = "";
    await files.forEach(async function(file) {
        let name = __dirname + "/client_src/" + file;
        console.log("Found source file: " + name);
        let t = await fs.readFileSync(name, {encoding: "utf-8"});
        text += t;
    });
    let out = __dirname + "/public/main.js";
    console.log("Writing to " + out + ".");
    await fs.writeFileSync(out, text);
    console.log("Done.");
}

run();