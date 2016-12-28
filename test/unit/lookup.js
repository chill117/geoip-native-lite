'use strict';

var _ = require('underscore');
var expect = require('chai').expect;

var GeoIpNativeLite = require('../../');

describe('lookup(ip)', function() {

	var ipAddresses = require('../fixtures/ipAddresses');

	it('should be a function', function() {

		expect(GeoIpNativeLite.lookup).to.be.a('function');
	});

	describe('without data loaded', function() {

		before(function() {
			// Clear cached data.
			GeoIpNativeLite._cache = {};
		});

		it('should throw an error', function() {

			var thrownError;
			var ipType = 'ipv4';
			var ipAddress = _.first(_.values(ipAddresses[ipType]));

			try {
				GeoIpNativeLite.lookup(ipAddress);
			} catch (error) {
				thrownError = error;
			}

			expect(thrownError.message).to.equal('Data (' + ipType + ') has not been loaded.');
		});
	});

	describe('with data loaded', function() {

		before(function(done) {
			GeoIpNativeLite.loadData({ ipv6: true }, done);
		});

		_.each(_.keys(ipAddresses), function(ipType) {

			describe(ipType, function() {

				it('should give the correct country', function() {

					_.each(ipAddresses[ipType], function(country, ipAddress) {

						var result = GeoIpNativeLite.lookup(ipAddress);

						try {
							expect(result).to.equal(country);
						} catch (error) {
							throw new Error('Wrong country (' + result + ') for ' + ipAddress);
						}
					});
				});
			});
		});
	});
});
