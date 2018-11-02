const {
    google
} = require("googleapis");

const oauth2client = new google.auth.OAuth2();

exports.getClasses = function (token, callback) {
    oauth2client.setCredentials(token);
    let classroom = google.classroom({
        version: "v1",
        auth
    })
    classroom.courses.list({
        pageSize: 10
    }, (err, res) => {
        if (err) return console.error('The API returned an error: ' + err);
        const courses = res.data.courses;
        if (courses && courses.length) {
            console.log('Courses:');
            courses.forEach((course) => {
                console.log(`${course.name} (${course.id})`);
            });
        } else {
            console.log('No courses found.');
        }
        callback(courses)
    })
}