# Database utilities

## Installation

  npm link wg-log
  npm link wg-utils
  npm install

## Connecting to a database

	const Database = require('wg-database').Database;
	
	const CNX = postgres://wgdbtest:wgdbtest@localhost/wgdbtest
	var db = new Database(CNX);

A ```UserContext``` contains all attributes related to the current user context, including authentication status, rights...
All database operations are run in a UserContext. 

	// This is a user context corresponding to the 'nobody user'
	var userContext = { authenticated:true, isAdmin:false, user:{uuid:'ab8f87ea-ad93-4365-bdf5-045fee58ee3b'}, rights:{admin:false} };

## Database Factory

Alternatively, you can use a factory

	const CNX = postgres://wgdbtest:wgdbtest@localhost/wgdbtest
	var factory = new DatabaseFactory(CNX);
	return factory.createDatabase(function(err, db) {
	  ...

## Life Cycle

The Database object is a passive object. It only references the conenction string and collects statistics.
Actual connections can be obtained through the ```withConnection``` function

	function myFunction(..., callback) {
	  return db.withConnection(function(client, callback) {
	  	// This block of code executes within the context of the 'client' database connection
	  	...
	  	return callback();
	  }, callback);
	}

The shutdown function will cleanup everything

	return Database.shutdown(function(err, stats) {
	  ...



## Executing SQL commands

	var commands = [
	  "DROP TABLE IF EXISTS test1",
	  "DROP TABLE IF EXISTS test2",
	  "CREATE TABLE test1 (id uuid PRIMARY KEY)",
	  "CREATE TABLE test2 (id uuid PRIMARY KEY)",
	  "INSERT INTO test1 (id) VALUES (uuid_generate_v4())"
	]
	return db.executeSQL(userContext, commands, function(err) {
	  ...

## Running queries
	
### Queries returning a single row

	return db.withConnection(function(client, callback) {
	  return db.query(client, "query_name", "SELECT COUNT(1) AS count FROM test1", [], function(err, result) {
	    var count = +result[0].count;
	    ...

### Queries returning multiple rows

	return db.withConnection(function(client, callback) {    
	  var query = "SELECT firstName, lastName FROM profiles";
	  return db.query(client, "profiles", query, [], function(err, result) {
	    if (err) return callback(err);
	    var profiles = [];
	    for (var i=0; i<result.length; i++) {
	      var row = result[i];
	      var profile = {
	        firstName: row["firstname"],
	        lastName: row["lastname"],
	      };
	      profiles.push(profile);
      }
      return callback(null, profiles);
    });

By default attribute aliases are lower-case, that why you write

	firstName: row["firstname"]

and not

	firstName: row["firstName"],

### Bindings

Bind parameters are represented by $1, $2...

	return db.withConnection(function(client, callback) {    
	  var query = "SELECT firstName, lastName FROM profiles WHERE firstName = $1 ";
	  var bidings = [ "Alex" ];
	  return db.query(client, "profiles", query, bindings, function(err, result) {
	    ...

### Escaping

The ```wg-utils``` module provides useful escaping functions

	var escaped = "WHERE name='" + utils.escapeForWhere(name) + "'";
	var escaped = "WHERE name LIKE '%" + utils.escapeForLike(name) + "%'";

### Updates
Updates will return the number of updated records

	var query = "UPDATE profiles SET deleted=1 WHERE id=$1";
	var bindings = [ profileId ];
	return db.query(client, "update profile", query, bindings, function(err, result) {
	  var rowCount = result;
	  ...



## Running a full database vacuum

	return db.vacuum(userContext, function(err) {
	  ...

