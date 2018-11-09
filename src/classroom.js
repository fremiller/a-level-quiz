const {
    google
} = require("googleapis");
var request = require("request");

exports.getClasses = function (token, isTeacher) {
    let p = new Promise((resolve, reject) => {
        var options = {
            method: 'GET',
            url: 'https://classroom.googleapis.com/v1/courses',
            qs: isTeacher ? {
                teacherId: 'me'
            } : {
                studentId: 'me'
            },
            headers: {
                'Authorization': "Bearer " + token,
                'cache-control': 'no-cache'
            }
        };

        request(options, function (err, res, body) {
            resolve(body)
        });
    })
    return p;
}

exports.getStudentsInClass = function(token, classId){
    let p = new Promise((resolve, reject) => {
        var options = {
            method: 'GET',
            url: 'https://classroom.googleapis.com/v1/courses',
            qs: isTeacher ? {
                teacherId: 'me'
            } : {
                studentId: 'me'
            },
            headers: {
                'Authorization': "Bearer " + token,
                'cache-control': 'no-cache'
            }
        };

        request(options, function (err, res, body) {
            let clas = undefined;
            body.courses.forEach((course)=>{
                if(course.id == classId){
                    clas = course;
                }
                
            })
            resolve(body)
        });
    })
    return p;
}