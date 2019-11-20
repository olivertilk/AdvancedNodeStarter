const mongoose = require('mongoose');
const redis = require('redis');
const util = require('util');

const redisUrl = 'redis://127.0.0.1:6379';
const client = redis.createClient(redisUrl);

//Redis does not return a promise so promisify to avoid callbacks
client.hget = util.promisify(client.hget);

//Get a reference to the original Mongoose-defined exec() function
const exec = mongoose.Query.prototype.exec;

//Create a new cache function on the Query prototype to create the ability to toggle caching
mongoose.Query.prototype.cache = function(options = {}) {
	//Set a flag on the query object to use caching.
	//'this' refers to the called query object
	this._cache = true;
	this._hashKey = JSON.stringify(options.key || '');  //'' is the default key

	//Make this function chainable
	return this;
}

//Overwrite Mongoose's exec() function and add caching layer
mongoose.Query.prototype.exec = async function () {
	//If no caching is required, just execute the query
	if(!this._cache){
		return exec.apply(this, arguments);
	}

	const key = JSON.stringify(Object.assign({}, this.getQuery(), {
		collection: this.mongooseCollection.name
	}));

	//Check if there is a value for 'key' in redis for the given hash key
	const cacheValue = await client.hget(this._hashKey, key);

	//If there is a cached value, return it
	if(cacheValue){
		//Exec must return a Model instance. A simple 'return JSON.parse(cacheValue);' won't work here. 
		//We can construct a new model referenced from the query being executed. However, need to
		//also check whether the cached value is a single document or an array of documents
		//Then hydrate the model(s)
		const doc = JSON.parse(cacheValue);
		return Array.isArray(doc) 
			? doc.map(document => new this.model(document))
			: new this.model(doc);
	}

	//Otherwise, issue the query and store the result in redis
	const result = await exec.apply(this, arguments);

	//Stores the array of documents in redis
	client.hset(this._hashKey, key, JSON.stringify(result), 'EX', 10);
	return result;
}


module.exports = {
	clearHash(hashKey) {
		//Delete data associated with a given hashKey
		client.del(JSON.stringify(hashKey));
	}
};