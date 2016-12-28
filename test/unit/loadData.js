'use strict';

var async = require('async');
var expect = require('chai').expect;

var GeoIpNativeLite = require('../../');

describe('loadData([options, ]cb)', function() {

	it('should be a function', function() {

		expect(GeoIpNativeLite.loadData).to.be.a('function');
	});

	describe('data not cached yet', function() {

		beforeEach(function() {
			// Clear cached data.
			GeoIpNativeLite._cache = {};
		});

		it('default options', function(done) {

			GeoIpNativeLite.loadData(function(error, data) {

				try {
					expect(error).to.equal(null);
					expect(data).to.be.an('object');
					expect(data.ipv4).to.be.an('array');
					expect(data.ipv4.length > 0).to.equal(true);
					expect(data.ipv6).to.equal(undefined);
					expect(GeoIpNativeLite._cache.ipv4).to.be.an('array');
					expect(GeoIpNativeLite._cache.ipv4.length > 0).to.equal(true);
					expect(GeoIpNativeLite._cache.ipv6).to.equal(undefined);
				} catch (error) {
					return done(error);
				}

				done();
			});
		});

		it('no cache', function(done) {

			var options = {
				cache: false
			};

			GeoIpNativeLite.loadData(options, function(error, data) {

				try {
					expect(error).to.equal(null);
					expect(data).to.be.an('object');
					expect(data.ipv4).to.be.an('array');
					expect(data.ipv4.length > 0).to.equal(true);
					expect(data.ipv6).to.equal(undefined);
					expect(GeoIpNativeLite._cache.ipv4).to.equal(undefined);
					expect(GeoIpNativeLite._cache.ipv6).to.equal(undefined);
				} catch (error) {
					return done(error);
				}

				done();
			});
		});

		it('ipv6', function(done) {

			var options = {
				ipv6: true
			};

			GeoIpNativeLite.loadData(options, function(error, data) {

				try {
					expect(error).to.equal(null);
					expect(data).to.be.an('object');
					expect(data.ipv4).to.be.an('array');
					expect(data.ipv4.length > 0).to.equal(true);
					expect(data.ipv6).to.be.an('array');
					expect(data.ipv6.length > 0).to.equal(true);
					expect(GeoIpNativeLite._cache.ipv4).to.be.an('array');
					expect(GeoIpNativeLite._cache.ipv4.length > 0).to.equal(true);
					expect(GeoIpNativeLite._cache.ipv6).to.be.an('array');
					expect(GeoIpNativeLite._cache.ipv6.length > 0).to.equal(true);
				} catch (error) {
					return done(error);
				}

				done();
			});
		});

		it('multiple calls (async, parallel)', function(done) {

			var options = { ipv4: true, ipv6: true, cache: false };

			async.parallel({
				data1: GeoIpNativeLite.loadData.bind(undefined, options),
				data2: GeoIpNativeLite.loadData.bind(undefined, options)
			}, function(error, results) {

				try {
					expect(error).to.equal(null);
					// The data from both calls should reference the same in-memory object.
					expect(results.data1.ipv4 === results.data2.ipv4).to.equal(true);
					expect(results.data1.ipv6 === results.data2.ipv6).to.equal(true);
				} catch (error) {
					return done(error);
				}

				done();
			});
		});

		it('multiple calls (async, series)', function(done) {

			var options = { ipv4: true, ipv6: true, cache: false };

			async.series({
				data1: GeoIpNativeLite.loadData.bind(undefined, options),
				data2: GeoIpNativeLite.loadData.bind(undefined, options)
			}, function(error, results) {

				try {
					expect(error).to.equal(null);
					// The data from both calls should reference different in-memory objects.
					expect(results.data1.ipv4 === results.data2.ipv4).to.equal(false);
					expect(results.data1.ipv6 === results.data2.ipv6).to.equal(false);
				} catch (error) {
					return done(error);
				}

				done();
			});
		});
	});

	describe('data already cached', function() {

		var options = { ipv4: true, ipv6: true, cache: true };

		before(function(done) {
			GeoIpNativeLite.loadData(options, done);
		});

		it('should load data from cache', function(done) {

			var cacheBefore = GeoIpNativeLite._cache;

			GeoIpNativeLite.loadData(options, function(error, data) {

				try {
					expect(error).to.equal(null);
					expect(data.ipv4 === cacheBefore.ipv4).to.equal(true);
					expect(data.ipv6 === cacheBefore.ipv6).to.equal(true);
				} catch (error) {
					return done(error);
				}

				done();
			});
		});
	});
});
