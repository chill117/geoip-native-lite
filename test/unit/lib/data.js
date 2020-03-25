'use strict';

var _ = require('underscore');
var async = require('async');
var expect = require('chai').expect;
var fs = require('fs');
var path = require('path');

var lib = require('../../../lib');
var ipAddresses = require(__dirname + '/../../fixtures/ipAddresses');
var GeoIpNativeLite = require('../../../');

describe('lib/data', function() {

	var originalDataDir, originalTmpDir;

	before(function() {

		// Save the original directory paths.
		originalDataDir = lib.data.config.dataDir;
		originalTmpDir = lib.data.config.tmpDir;

		// Override directory paths.
		lib.data.config.dataDir = path.join(__dirname, '..', '..', 'data');
		lib.data.config.tmpDir = path.join(lib.data.config.dataDir, 'tmp');
	});

	beforeEach(lib.data.cleanup);
	beforeEach(lib.data.setup);
	after(lib.data.cleanup);

	after(function() {

		// Restore directory paths to their original values.
		lib.data.config.dataDir = originalDataDir;
		lib.data.config.tmpDir = originalTmpDir;
	});

	describe.skip('download()', function() {

		it('should be a function', function() {

			expect(lib.data.download).to.be.a('function');
		});

		it('should download maxmind geo-ip data file(s)', function(done) {

			// This test depends on downloading file(s) from the maxmind servers.
			this.timeout(10000);

			lib.data.download(function(error) {

				if (error) {
					return done(error);
				}

				fs.readdir(lib.data.config.tmpDir, function(error, files) {

					if (error) {
						return done(error);
					}

					try {
						expect(files).to.deep.equal([
							'GeoLite2-Country-CSV.zip'
						]);
					} catch (error) {
						return done(error);
					}

					done();
				});
			});
		});
	});

	describe('extract()', function() {

		beforeEach(placeZipArchiveFixture);

		it('should be a function', function() {

			expect(lib.data.extract).to.be.a('function');
		});

		it('should extract geo-ip data file(s) from downloaded ZIP archive', function(done) {

			lib.data.extract(function(error) {

				if (error) {
					return done(error);
				}

				fs.readdir(lib.data.config.tmpDir, function(error, files) {

					if (error) {
						return done(error);
					}

					try {
						expect(files).to.deep.equal([
							'COPYRIGHT.txt',
							'GeoLite2-Country-Blocks-IPv4.csv',
							'GeoLite2-Country-Blocks-IPv6.csv',
							'GeoLite2-Country-CSV.zip',
							'GeoLite2-Country-Locations-en.csv',
							'LICENSE.txt'
						]);
					} catch (error) {
						return done(error);
					}

					done();
				});
			});
		});
	});

	describe('update()', function() {

		beforeEach(deleteDataFiles);
		beforeEach(placeZipArchiveFixture);

		it('should be a function', function() {

			expect(lib.data.update).to.be.a('function');
		});

		it('should rebuild geo-ip data files', function(done) {

			// Takes a while to process the data files.
			this.timeout(60000);

			lib.data.update(function(error) {

				if (error) {
					return done(error);
				}

				fs.readdir(lib.data.config.dataDir, function(error, files) {

					if (error) {
						return done(error);
					}

					try {
						expect(files).to.deep.equal([
							'COPYRIGHT.txt',
							'LICENSE.txt',
							'country-ipv4.json',
							'country-ipv6.json'
						]);
					} catch (error) {
						return done(error);
					}

					// Sanity check to ensure that everything is working.
					GeoIpNativeLite.loadData({ ipv6: true }, function(error) {

						if (error) {
							return done(error);
						}

						try {
							_.each(['ipv4', 'ipv6'], function(ipType) {
								_.each(ipAddresses[ipType], function(country, ipAddress) {
									var result = GeoIpNativeLite.lookup(ipAddress);
									try {
										expect(result).to.equal(country);
									} catch (error) {
										throw new Error('Wrong country (' + result + ') for ' + ipAddress);
									}
								});
							});
						} catch (error) {
							return done(error);
						}

						done();
					});
				});
			});
		});
	});
});

function placeZipArchiveFixture(cb) {

	// Place the sample ZIP archive in the temp directory.

	var src = path.join(__dirname, '..', '..', 'fixtures', 'data', 'GeoLite2-Country-CSV.zip');
	var dest = path.join(lib.data.config.tmpDir, 'GeoLite2-Country-CSV.zip');
	var done = _.once(cb);

	fs.stat(dest, function(error) {

		if (!error) {
			// Already exists.
			return done();
		}

		var readStream = fs.createReadStream(src);
		var writeStream = fs.createWriteStream(dest);

		readStream.on('error', done);
		writeStream.on('error', done);
		readStream.pipe(writeStream).on('error', done);
		writeStream.on('close', done);
	});
}

function deleteDataFiles(cb) {

	fs.readdir(lib.data.config.dataDir, function(error, files) {

		async.each(files, function(file, next) {

			fs.stat(path.join(lib.data.config.dataDir, file), function(error, stat) {

				// Only delete files.
				if (error || !stat.isFile()) {
					return next();
				}

				fs.unlink(path.join(lib.data.config.dataDir, file), next);
			});

		}, cb);
	});
}
