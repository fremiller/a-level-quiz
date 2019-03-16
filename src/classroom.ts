import * as request from "request";

export interface ClassInfo{
    id: string
    name: string
    courseState?: string
}

export interface GCResult{
    courses: ClassInfo[]
}

/**
 * Queries a user's google classroom classes
 * @param token The client's access token
 * @param isTeacher Whether the client is a teacher or not
 */
export function getClasses(token: string, isTeacher:boolean) : Promise<GCResult>{
    if(token.startsWith("TEST_")){
        return new Promise((res, rej)=>{
            res({"courses":[{id:"TEST_CLASS",name:"Test Class"}]})
        })
        
    }
    return new Promise((resolve, reject) => {
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
}

/**
 * Queries class information from google classroom
 * @param token The client's access token
 * @param classId The class ID to find
 * @param isTeacher Whether the client is a teacher
 */
export function getUsersInClass(token: string, classId: string, isTeacher=true): Promise<any>{
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