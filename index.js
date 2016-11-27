/**
 * wg-database - NPM package entry point
 */
// (C) Alexandre Morin 2015 - 2016

const Database = require('./lib/database.js');
const DatabaseFactory = require('./lib/databaseFactory.js');

/**
 * Public interface
 */
module.exports = {
  Database: Database,
  DatabaseFactory: DatabaseFactory,
};
