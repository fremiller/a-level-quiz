let fs = require("fs");
let compressor = require("node-minify");

async function run() {
    walk(__dirname + "/client_src", async function (err, files) {
        let text = "";
        for (let i = 0; i < files.length; i++){
            let name = files[i];
            console.log("Found source file: " + name);
            let t = await fs.readFileSync(name, { encoding: "utf-8" });
            text += t;
        }
        let out = __dirname + "/main.js";
        console.log("Writing to " + out + ".");
        await fs.writeFileSync(out, text);
        console.log("Compressing files...");
        compressor.minify({
            compressor: 'gcc',
            input: __dirname + "/main.js",
            output: __dirname + "/public/main.js",
            callback: function(err, min){
                console.log("done");
            }
        })
    });
}

var walk = function (dir, done) {
    var results = [];
    fs.readdir(dir, function (err, list) {
        if (err) return done(err);
        var i = 0;
        (function next() {
            var file = list[i++];
            if (!file) return done(null, results);
            file = dir + '/' + file;
            fs.stat(file, function (err, stat) {
                if (stat && stat.isDirectory()) {
                    walk(file, function (err, res) {
                        results = results.concat(res);
                        next();
                    });
                } else {
                    results.push(file);
                    next();
                }
            });
        })();
    });
};

run();
