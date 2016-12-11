/**
 * wg-database - Database unit tests
 */
// (C) Alexandre Morin 2015 - 2016

describe('Database', function() {

  const assert = require('assert');
  const helpers = require('./helpers.js');
  const Database = require('../lib/database.js');
  const DatabaseFactory = require('../lib/databaseFactory.js');

  /** ================================================================================
    * Test database connection
    * ================================================================================ */

  describe('Connection', function() {
    it('Should connect', function(done) {
      return helpers.asNobody(function(db, userContext) {
        return db.withConnection(function(client, callback) { return callback(); }, done);
      });
    });
  });


  /** ================================================================================
    * Test vacuum
    * ================================================================================ */

  describe('Vacuum functions', function() {
    it('Should not have rights to vacuum (need admin rights)', function(done) {
      return helpers.asNobody(function(db, userContext) {
        return db.vacuum(userContext, function(err) {
          assert(Database.isAccessError(err), "Call to 'vacuum' should have failed");
          return done();
        });
      });
    });

    it('Should run vacuum (admin)', function(done) {
      return helpers.asAlexAdmin(function(db, userContext) {
        return db.vacuum(userContext, function(err) {
          return done(err);
        });
      });
    });
  });

  /** ================================================================================
    * Test execute SQL
    * ================================================================================ */

  describe('executeSQL', function() {
    it('Should create 2 tables', function(done) {
      return helpers.asNobody(function(db, userContext) {
        var commands = [
          "DROP TABLE IF EXISTS test1",
          "DROP TABLE IF EXISTS test2",
          "CREATE TABLE test1 (id uuid PRIMARY KEY)",
          "CREATE TABLE test2 (id uuid PRIMARY KEY)",
          "INSERT INTO test1 (id) VALUES (uuid_generate_v4())"
        ]
        return db.executeSQL(userContext, commands, function(err) {
          assert (err === undefined || err === null, "Failed to run SQL commands");
          return db.withConnection(function(client, callback) {
            return db.query(client, "test1", "SELECT COUNT(1) AS count FROM test1", [], function(err, result) {
              assert (err === undefined || err === null, "Failed to count table size (1)");
              var count = +result[0].count;
              assert (count === 1, "Expecting 1 record");
              return db.query(client, "test2", "SELECT COUNT(1) AS count FROM test2", [], function(err, result) {
                assert (err === undefined || err === null, "Failed to count table size (2)");
                var count = +result[0].count;
                assert (count === 0, "Expecting 0 records");
                return done();
              });
            });
          });
        });
      });
    });

  });


  /** ================================================================================
    * Test timezones
    * ================================================================================ */

  describe('Test timezones', function() {
    it('Should not be more than 1 minute appart', function(done) {
      return helpers.asNobody(function(db, userContext) {
        return db.withConnection(function(client, callback) {
          return db.query(client, "test1", "SELECT current_timestamp AS now, current_timestamp + interval '3600 second' AS later", [], function(err, result) {
            assert (err === undefined || err === null, "Failed to get current time");
            var dbNow = new Date(+result[0].now);
            var dbLater = new Date(+result[0].later);
            var now = new Date();
            return done();
          });
        });
      });
    });

  });

  /** ================================================================================
    * Test database factory
    * ================================================================================ */

  describe('Database Factory', function() {
    it('Should use factory', function(done) {
      var factory = new DatabaseFactory(helpers.CNX);
      return factory.createDatabase(function(err, db) {
        assert (err === undefined || err === null, "Failed to create database using factory");
        return db.withConnection(function(client, callback) {
            return db.query(client, "test factory", "SELECT COUNT(1) AS count FROM core_users WHERE builtin=true", [], function(err, result) {
              assert (err === undefined || err === null, "Failed to count the number of builtin users");
              var count = +result[0].count;
              assert (count === 1, "Expecting 1 record");
              return callback();
            });
          }, function(err) {
          return Database.shutdown(function(err, stats) {
            if (err) log.warn({err:err}, "Failed to shutdown database");
            return done();
          });
        });
      });
    });
  });

});


