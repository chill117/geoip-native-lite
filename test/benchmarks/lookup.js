'use strict';

var _ = require('underscore');
var Benchmark = require('benchmark');

var GeoIpNativeLite = require('../../');

describe('benchmark: lookup', function() {

	var ips = require('../fixtures/ips');

	before(function(done) {

		GeoIpNativeLite.loadData({ ipv6: true }, done);
	});

	_.each(_.keys(ips), function(ipType) {

		var ipsArray = _.keys(ips[ipType]);

		it(ipType, function(done) {

			this.timeout(15000);

			var i = 0;

			var bench = new Benchmark(function() {
				var ip = ipsArray[i++] || ipsArray[i = 0];
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
