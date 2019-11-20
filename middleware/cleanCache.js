const { clearHash } = require('../services/cache');

//Middleware to allow clearing of cache
module.exports = async (req, res, next) => {
	//This trick here makes sure that we call the next() function, which is the
	//route handler, and wait for it to finish before going on to clear cache
	await next();

	//Now clear cache
	clearHash(req.user.id);
};