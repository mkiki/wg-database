/**
 * wg-database - Test utils / helpers
 */
// (C) Alexandre Morin 2015 - 2016

const utils = require('wg-utils');
const extend = require('extend');
const CNX = "postgres://wgdbtest:wgdbtest@localhost/wgdbtest";

var db;

// Wrappers to run functions with different sets of credentials
asNobody = function(callback)       { var userContext = { authenticated:true, isAdmin:false, user:{uuid:'ab8f87ea-ad93-4365-bdf5-045fee58ee3b'}, rights:{admin:false} };  return callback(db, userContext); };
asAlex = function(callback)         { var userContext = { authenticated:true, isAdmin:false, user:{uuid:'dec4c80d-e0f4-4bd8-b64d-8425fe04e1ea'}, rights:{admin:false} };  return callback(db, userContext); };
asAlexAdmin = function(callback)    { var userContext = { authenticated:true, isAdmin:true,  user:{uuid:'dec4c80d-e0f4-4bd8-b64d-8425fe04e1ea'}, rights:{admin:true}  };  return callback(db, userContext); };

var Database = require('../lib/database.js');
db = new Database(CNX);

// Recreate the whole database
recreateDatabase = function(callback) {
  var userContext = { authenticated:true, user:{uuid:'ab8f87ea-ad93-4365-bdf5-045fee58ee3b'}, rights:{admin:false} };
  return asNobody(function(db, userContext) {
    return db.executeSQL(userContext, [
    ], callback);
  });
}


/**
 * Database setup
 */

// Called once before executing tests
before(function(done) {
  return recreateDatabase(done);
});

// Called once after executing tests
after(function(done) {
  return Database.shutdown(function(err, stats) {
    if (err) log.warn({err:err}, "Failed to shutdown database");
    return done();
  });
});

// Executed before each test
beforeEach(function(done) {
  return asNobody(function() {
    done();
  });
});


/** ================================================================================
  * Public interface
  * ================================================================================ */
module.exports = {
  cnx:                CNX,
  db:                 db,
  asNobody:           asNobody,
  asAlex:             asAlex,
  asAlexAdmin:        asAlexAdmin
};