/**
 * 
 *  This is an enum which is used in the user object to store the type of the user
 *  @enum {number}
 */
let UserType = exports.UserType = {
    /** The user is a student */
    "STUDENT": 0,
    /** The user is a teacher */
    "TEACHER": 1,
    /** The user is an administrator */
    "ADMIN": 2
}

if(exports){
    exports.UserType = UserType
}