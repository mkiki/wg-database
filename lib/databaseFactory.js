/**
 * wg-database - Database factory
 */
// (C) Alexandre Morin 2015 - 2016

const Database = require('./database.js');
const Log = require('wg-log').Log;
const Exception = require('wg-log').Exception;

var log = Log.getLogger('wg-database::DatabaseFactory');

DatabaseFactory = function(cnx) {
  this.cnx = cnx;
}

/**
 */
DatabaseFactory.prototype.createDatabase = function(callback) {
  var that = this;
  log.debug("Creating a database");
  var db = new Database(that.cnx);
  return callback(undefined, db);
}


/**
 * Public interface
 */
module.exports = DatabaseFactory;
