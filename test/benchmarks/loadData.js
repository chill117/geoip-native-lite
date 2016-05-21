'use strict';

var async = require('async');

var GeoIpNativeLite = require('../../');

describe('benchmark: loadData', function() {

	describe('memory usage', function() {

		var memoryUsage = {};

		function getMemoryUsage() {

			return process.memoryUsage().heapUsed - memoryUsage.before.heapUsed;
		}

		before(function() {

			memoryUsage.before = process.memoryUsage();
		});

		it('ipv4 and ipv6', function(done) {

			var maxMemoryUsage = 54000000;

			var options = {
				ipv4: true,
				ipv6: true
			};

			async.timesSeries(7, function(index, next) {
				GeoIpNativeLite.loadData(options, function() {
					next();
				});
			}, function() {

				var memoryUsage = getMemoryUsage();

				console.log('Memory usage:', '~' + (memoryUsage / 1000000).toFixed(2), 'mB');

				if (memoryUsage > maxMemoryUsage) {
					return done(new Error('Unexpectedly high memory usage.'));
				}

				done();
			});
		});
	});
});
