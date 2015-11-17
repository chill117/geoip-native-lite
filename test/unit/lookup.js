'use strict';

var _ = require('underscore');
var expect = require('chai').expect;

var GeoIpNativeLite = require('../../');

describe('lookup(ip)', function() {

	var ips = require('../fixtures/ips');

	before(function(done) {

		GeoIpNativeLite.loadData({ ipv6: true }, done);
	});

	it('should be a function', function() {

		expect(GeoIpNativeLite.lookup).to.be.a('function');
	});

	_.each(_.keys(ips), function(ipType) {

		describe(ipType, function() {

			it('should give the correct country', function() {

				_.each(ips[ipType], function(country, ip_address) {

					var result = GeoIpNativeLite.lookup(ip_address);

					try {
						expect(result).to.equal(country);
					} catch (error) {
						throw new Error('Wrong country (' + result + ') for ' + ip_address);
					}
				});
			});
		});
	});
});
