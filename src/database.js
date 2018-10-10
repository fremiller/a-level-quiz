let sql = require("mysql");

/**
 * Database
 * Database is a class which handles queries to the MySQL database
 */
class Database{
    /**
     * 
     * @param {String} _databaseURL The URL of the database to connect to
     * @param {String} _databaseUsername The username to use in the database
     * @param {String} _databasePassword The password to use in the database
     * @param {String} _table The table in the database with the required data structures
     * @param {function?} callback The function which calls when the database is ready 
     */
    constructor(_databaseURL, _databaseUsername, _databasePassword, _table, callback){
        this.databaseURL = _databaseURL;
        this.table = _table;
        // Create a DB connection object
        this.connection = Database.ConnectToDatabase(this.databaseURL, _databaseUsername, _databasePassword);
        // Connect to the database
        this.connection.connect(function(err){
            if(err){
                return;
            }
            console.log(`Connected to database ${_databaseURL}`);
            if(callback){
                callback();
            }
        });
    }

    /**
     * Returns a database connection
     * @param {String} url The URL of the database server
     * @param {String} username The username to authenticate with
     * @param {String} password The password to authenticate with
     */
    static ConnectToDatabase(url, username, password){
        return sql.createConnection({
            host: url,
            user: username,
            password: password,
            database: "testdb"
        });
    }

    QueryAll(query, callback){
        this.connection.query(query, function(err, result){
            if(err) throw err;
            callback(result);
        })
    }
}
