/**
 * wg-database - Database access functions
 */
// (C) Alexandre Morin 2015 - 2016

const pg = require('pg');
const utils = require('wg-utils');
const extend = require('extend');
const Log = require('wg-log').Log;
const Exception = require('wg-log').Exception;
const moment = require('moment');

const log = Log.getLogger('wg-database::Database');
const queryLog = Log.getLogger('wg-database::queries');


// key = query name
// value = stats
//            cumulatedDuration
//            numberOfCalls
//            cumulatedReturnedRows
var statsByQueryName = {};


/**
var TIMESTAMPTZ_OID = 1184
var TIMESTAMP_OID = 1114
var parseFn = function(val) {
  debugger;
  return oldParsFn(val);
   return val === null ? null : moment(val)
}
var oldParsFn = pg.types.getTypeParser(TIMESTAMP_OID);
//pg.types.setTypeParser(TIMESTAMPTZ_OID, parseFn)
pg.types.setTypeParser(TIMESTAMP_OID, parseFn)
*/


/** ================================================================================
  * Access Management
  *
  * userContext: {
  *   authenticated:  true|false      is the user authenticated (verified)?
  *   isAdmin:        true|false      is the user an administratory?
  *   user: {                         user record
  *     uuid:                         user id
  *     login:                        user login
  *     ...
  *   },
  *   rights: {                       name rights
  *     admin:                        is the user an admin?
  *     auth:                         does the user/context has rights to perform authentication/session management operations?
  *   }
  * }
  *
  *
  * ================================================================================ */

function AccessError(message, infos) {
  this.message = message;
  this.infos = infos;
}


/** ================================================================================
  * Database accessors and helpers
  * ================================================================================ */

/**
 * Creates a database accessor
 *
 * @param cnx         is the database connection string. Ex: postgres://photos:photos@localhost/photos
 */
function Database(cnx) {
  this._cnx = cnx;
}

/**
 * /Static/ Shutdown database
 */
Database.shutdown = function(callback) {
  var allStats = [];
  Object.keys(statsByQueryName).forEach(function(name) {
    var stats = statsByQueryName[name];
    var avgDuration = stats.cumulatedDuration / stats.numberOfCalls;
    avgDuration = Math.round(avgDuration*100) / 100;
    var avgRows = stats.cumulatedReturnedRows / stats.numberOfCalls;
    avgRows = Math.round(avgRows*100) / 100;
    allStats.push({ query:name, calls:stats.numberOfCalls, avgDuration:avgDuration, avgRows:avgRows });
  });
  //queryLog.info({ stats:allStats }, "Query statistics");
  pg.end();
  return callback(undefined, allStats);
}

/**
 * /Static/ Returns a boolean indicating whether an error is a database access error
 */
Database.isAccessError = function(err) {
  if (!err) return false;
  return err instanceof AccessError;
}

/**
 * Execute a code block within a pg connection. Takes care of the connection and of the cleanup
 * @param execute     is the function to execute
 *                        @param client     is the database client connection
 *                        @param callback   is the return function
 *                                              @err is the error code/message
 *                                              @result is the result of the code execution (only one result value)
 * @param callback     is the return function
 *                        @param  err       is the error code/message
 *                        @param  result    is the result from the 'exectue' code block
 */
Database.prototype.withConnection = function(execute, callback) {
  var that = this;
  log.debug("Starting connection to postgres");
  return pg.connect(that._cnx, function(err, client, done) {

    if (err) return callback(new Exception(undefined, "Failed to establish connection to the database", err));
    // Execute passed code block
    return execute(client, function(err, result) {
      log.debug("Ending connection");
      done(); // Close connection
      if (err) {
        if (Database.isAccessError(err)) return callback(err);
        return callback(new Exception(undefined, "Failed to execute database command", err));
      }
      return callback(null, result);
    });
  });
}

/**
 * Wraps the database query command to add logging
 * @param client        is the pg connection
 * @param name          is the query name
 * @param query         is the query (SQL)
 * @param bindings      is an array of bound parameters (or null)
 * @param callback      is the return function
 *                         @param err      is the error code/message
 *                          @param result   is the result of the query execution
 */
Database.prototype.query = function(client, name, query, bindings, callback) {
  var that = this;
  if (!bindings) bindings = [];
  bindings = bindings.slice();
  log.debug({ query:query, bindings:bindings }, "Executing query");
  var tsStart = utils.now();
  return client.query(query, bindings, function(err, result) {
    var tsEnd = utils.now();
    log.debug({ err:err, result:result?result.rows:[] }, "Query results");
    if (err) return callback(new Exception({ query:query, bindings:bindings, message:err.message }, "Failed to execute query", err));
    queryLog.debug({ tsStart:tsStart, tsEnd:tsEnd, duration:tsEnd-tsStart, query:name });

    var stats = statsByQueryName[name];
    if (!stats) stats = statsByQueryName[name] = { cumulatedDuration:0, numberOfCalls:0, cumulatedReturnedRows:0 };
    stats.cumulatedDuration = stats.cumulatedDuration + tsEnd-tsStart;
    stats.numberOfCalls = stats.numberOfCalls + 1;

    if (result && result.command === 'SELECT') {
      var rows = result.rows;
      stats.cumulatedReturnedRows = stats.cumulatedReturnedRows + rows.length;
      return callback(undefined, rows);
    }
    if (result && (result.command === 'INSERT' || result.command === 'UPDATE' || result.command === 'DELETE')) {
      return callback(undefined, result.rowCount);
    }
    return callback();
  });
}

/**
 */
Database.prototype.requiresRights = function(message, infos) {
  var that = this;
  log.debug({message: message, infos:infos}, "Testing rights (requiresRights)");
  return new AccessError(message, infos);
}

/** ================================================================================
  * Cleanup
  * ================================================================================ */


/**
 * Database hygiene (vacuum)
 *
 * @param callback    is the return function
 *                        err is the error object/code
 *
 * Access rights
 * - Requires a user context with admin rights
 */
Database.prototype.vacuum = function(userContext, callback) {
  var that = this;
  if (!userContext || !userContext.isAdmin)
    return callback(that.requiresRights("vacuum requires admin rights"));

  return that.withConnection(function(client, callback) {
    var query = "VACUUM FULL ANALYSE";
    return that.query(client, "vacuum", query, null, function(err, result) {
      if (err) return callback(new Exception(undefined, "Failed to vacuum database", err));
      return callback();
    });
  }, callback);
}


/** ================================================================================
  * Execute SQL (or DDL) commands
  * ================================================================================ */

/**
 * Execute SQL commands in sequence
 * @param userContext
 * @param {String[]} commands - the list of commands to execute (fail-fast)
 * @param {function} callback - the return callback
 */
Database.prototype.executeSQL = function(userContext, commands, callback) {
  var that = this;
  return that.withConnection(function(client, callback) {
    return that._executeSQL(userContext, client, commands, callback);
  }, callback);
}
Database.prototype._executeSQL = function(userContext, client, commands, callback) {
  var that = this;
  if (commands.length === 0) return callback();
  var query = commands.shift();
  return that.query(client, "SQL Command", query, [], function(err) {
    if (err) return callback(new Exception({command:query}, "Failed to execute SQL command", err));
    return that._executeSQL(userContext, client, commands, callback);
  });
}


/** ================================================================================
  * Public interface
  * ================================================================================ */
module.exports = Database;


