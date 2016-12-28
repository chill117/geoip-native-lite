'use strict';

var _ = require('underscore');
var Benchmark = require('benchmark');

var GeoIpNativeLite = require('../../');

describe('benchmark: lookup', function() {

	var ipAddresses = require('../fixtures/ipAddresses');

	describe('operations/second', function() {

		before(function(done) {

			GeoIpNativeLite.loadData({ ipv6: true }, done);
		});

		_.each(_.keys(ipAddresses), function(ipType) {

			var ipAddressesArray = _.keys(ipAddresses[ipType]);

			it(ipType, function(done) {

				this.timeout(15000);

				var i = 0;

				var bench = new Benchmark(function() {
					var ip = ipAddressesArray[i++] || ipAddressesArray[i = 0];
					GeoIpNativeLite.lookup(ip);
				});

				bench.on('complete', function(result) {

					if (result.target.error) {
						return done(result.target.error);
					}

					console.log(result.target.toString());
					done();
				});

				bench.run();
			});
		});
	});
});
