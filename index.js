'use strict';

var _ = require('underscore');
var async = require('async');
var fs = require('fs');

var utils = require('./lib/utils');

var GeoIpNativeLite = module.exports = {

	// In-memory data cache:
	_cache: {},

	// Full path to data directory:
	_dataDir: __dirname + '/data',

	// Loading flags:
	_loading: {},

	// Callbacks waiting for data to be loaded:
	_waiting: {
		ipv4: [],
		ipv6: []
	},

	lookup: function(ip) {

		var ipType = ip.indexOf(':') !== -1 ? 'ipv6' : 'ipv4';
		var list = GeoIpNativeLite._cache[ipType];

		if (_.isUndefined(list)) {
			throw new Error('Data (' + ipType + ') has not been loaded.');
		}

		var ipToIntFn;

		if (ipType === 'ipv6') {
			ipToIntFn = utils.ipv6ToIntArray;
		} else {
			ipToIntFn = utils.ipv4ToInt;
		}

		var ipInt = ipToIntFn(ip);
		var index = GeoIpNativeLite.binaryIpSearch(list, ipInt, ipType);

		if (index === -1) {
			// Not found.
			return null;
		}

		return list[index].c;
	},

	loadData: function(options, cb) {

		if (_.isUndefined(cb)) {
			cb = options;
			options = null;
		}

		options = _.defaults(options || {}, { ipv4: true, ipv6: false, cache: true });

		async.parallel({

			ipv4: function(next) {

				if (!options.ipv4) {
					return next();
				}

				if (options.cache && GeoIpNativeLite._cache.ipv4) {
					return next(null, GeoIpNativeLite._cache.ipv4);
				}

				GeoIpNativeLite.loadDataFromFile('ipv4', next);
			},

			ipv6: function(next) {

				if (!options.ipv6) {
					return next();
				}

				if (options.cache && GeoIpNativeLite._cache.ipv6) {
					return next(null, GeoIpNativeLite._cache.ipv6);
				}

				GeoIpNativeLite.loadDataFromFile('ipv6', next);
			}

		}, function(error, data) {

			if (error) {
				return cb(error);
			}

			if (options.cache) {
				// Cache the data in memory.
				_.each(data, function(item, key) {
					GeoIpNativeLite._cache[key] || (GeoIpNativeLite._cache[key] = item);
				});
			}

			cb(null, data);
		});
	},

	loadDataSync: function(options) {

		options = _.defaults(options || {}, { ipv4: true, ipv6: false, cache: true });

		var data = {};

		if (options.ipv4) {

			if (options.cache && GeoIpNativeLite._cache.ipv4) {
				data.ipv4 = GeoIpNativeLite._cache.ipv4;
			} else {
				data.ipv4 = GeoIpNativeLite.loadDataFromFileSync('ipv4');
			}
		}

		if (options.ipv6) {

			if (options.cache && GeoIpNativeLite._cache.ipv6) {
				data.ipv6 = GeoIpNativeLite._cache.ipv6;
			} else {
				data.ipv6 = GeoIpNativeLite.loadDataFromFileSync('ipv6');
			}
		}

		if (options.cache) {
			// Cache the data in memory.
			_.each(data, function(_data, key) {
				GeoIpNativeLite._cache[key] || (GeoIpNativeLite._cache[key] = _data);
			});
		}

		return data;
	},

	loadDataFromFile: function(ipType, cb) {

		var dataFile = GeoIpNativeLite._dataDir + '/country-' + ipType + '.json';

		fs.readFile(dataFile, 'utf8', function(error, data) {

			if (error) {
				return cb(error);
			}

			try {
				data = JSON.parse(data);
			} catch (error) {
				return cb(error);
			}

			cb(null, data);
		});
	},

	loadDataFromFileSync: function(ipType) {

		var dataFile = GeoIpNativeLite._dataDir + '/country-' + ipType + '.json';
		var data = fs.readFileSync(dataFile, 'utf8');

		return JSON.parse(data);
	},

	/*
		Similar to underscore's sortedIndex(), but with a comparator function.

		And a little bit more efficient for this module's specific needs.
	*/
	binaryIpSearch: function(ipRangesArray, ip, type) {

		var comparator = type === 'ipv6' ? GeoIpNativeLite.inRangeIpv6 : GeoIpNativeLite.inRangeIpv4;
		var low = 0;
		var high = ipRangesArray.length;
		var mid;
		var result;

		while (low < high) {

			mid = Math.floor((low + high) / 2);
			result = comparator(ipRangesArray[mid], ip);

			if (result === 0) {
				return mid;
			}

			if (result === -1) {
				low = mid + 1;
			} else {
				high = mid;
			}
		}

		return -1;
	},

	inRangeIpv4: function(ipRange, ip) {

		var start = ipRange.s;
		var end = ipRange.e || ipRange.s;

		return ip < start ? 1 : ip > end ? -1 : 0;
	},

	inRangeIpv6: function(ipRange, ip) {

		var start = ipRange.s;
		var end = ipRange.e;

		if (!end) {
			return GeoIpNativeLite.compareIpv6(start, ip);
		}

		if (GeoIpNativeLite.compareIpv6(start, ip) === 1) {
			return 1;
		}

		if (GeoIpNativeLite.compareIpv6(end, ip) === -1) {
			return -1;
		}

		return 0;
	},

	compareIpv6: function(ip1, ip2) {

		for (var i = 0; i < 2; i++) {

			if (ip1[i] < ip2[i]) {
				return -1;
			}

			if (ip1[i] > ip2[i]) {
				return 1;
			}
		}

		return 0;
	}
};
