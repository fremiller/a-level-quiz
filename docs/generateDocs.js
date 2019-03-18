let docs = require("./output/docs.json");
let fs = require("fs");
let style = "";
let currentDoc = docs;
let alreadyRead = [];
async function run(){
    style = "<style>" + await fs.readFileSync(__dirname + "/docstyle.css") +  "</style>";
    await fs.writeFileSync(__dirname + "/output/documentation.html", generateDocs(docs) + style);
}

run();
function generateDocs(doc) {
    let outChild = [];
    //if(alreadyRead.indexOf(doc.id) != -1){
    //    return;
    //}
    alreadyRead.push(doc.id);
    if (doc.children && !(doc.groups && doc.id != 0)) {
        doc.children.forEach((child) => {
            outChild.push(generateDocs(child));
        })
    }

    let signatures = "";
    if (doc.sources) {
        signatures += `<p class="source">${doc.sources[0].fileName}:${doc.sources[0].line}</p>`
    }
    if (doc.extendedTypes) {
        signatures += `<p class="inherits">Inherits ${doc.extendedTypes.map((type) => {
            return type.name
        }).join(", ")}</p>`
    }
    if (doc.comment) {
        signatures += `<p>${doc.comment.shortText}</p>`;
    }
    if (doc.signatures) {
        signatures = doc.signatures.map((signature) => {
            let out = "";
            out += signature.comment ? signature.comment.shortText : ""
            if (signature.parameters) {
                out += "<h3>Parameters</h3><table><tr><th>Type</th><th>Name</th><th>Comment</th></tr>";
                out += signature.parameters.map((param) => {
                    return `<tr><td>${param.type.name}</td><td>${param.name}</td><td>${param.comment ? param.comment.text : ""}</td></tr>`
                }).join("");
                out += "</table>"
            }
            return out;
        }).join("")
    }

    if (doc.kind == 256 && doc.children) {
        signatures += "<table><tr><th>Type</th><th>Name</th></tr>"
        signatures += doc.children.map((child) => {
            if (child.inheritedFrom) {
                return "";
            }
            return `<tr><td>${child.type ? child.type.name : ""}</td><td>${child.name}</td></tr>`
        }).join("")
        signatures += "</table>"
    }

    let groups = "";
    if (doc.groups && doc.kind != 256) {
        doc.groups.forEach((group) => {
            if (group.kind == 32) {
                return "";
            }
            let elements = group.children.map((cid) => {
                return findElementsById(cid);
            })
            let children = elements.map((child) => {
                return generateDocs(child);
            }).join("");
            groups += `<div><h1>${group.title}</h1>${children}</div>`
        })
    }
    let headerType = 1;
    if ([843, 128, 1, 0, 256].indexOf(doc.kind) == -1) {
        headerType = 2;
    }

    var title = "";

    if (doc.defaultValue) {
        title += `=${doc.defaultValue}`;
    }

    let type = doc.kindString;
    let async = false;
    if(doc.kind == 2048 && doc.signatures){
        let sign = doc.signatures[0];
        if(sign.type){
            type = sign.type.name;
            if(sign.type.type == "array" && sign.type.elementType){
                type = sign.type.elementType.name + "[]";
            }
            if(sign.type.name == "Promise"){
                type = `Promise&lt;${sign.type.typeArguments[0].name}&gt;`
            }
        }
    }

    return `<div class="box ${[1, 128].indexOf(doc.kind) != -1?"class":""}"><h${headerType}>${type} ${doc.name}${doc.kind == 2048?"()":""} ${title}</h${headerType}> <div>${signatures} ${groups}</div></div>`
}

function findElementsById(id, doc = docs) {
    if (doc.id == id) {
        alreadyRead.push(id);
        return doc
    }
    if (doc.children) {
        for (let i = 0; i < doc.children.length; i++) {
            let child = doc.children[i];
            let e = findElementsById(id, child)
            if (e) {
                return e
            }
        }
    }
    else {
        return undefined
    }
}