'use strict';

var _ = require('underscore');
var Address4 = require('ip-address').Address4;
var Address6 = require('ip-address').Address6;
var async = require('async');
var fs = require('fs');
var https = require('https');
var lazy = require('lazy');
var path = require('path');
var url = require('url');
var yauzl = require('yauzl');

var utils = require('./utils');
var dataDir = __dirname + '/../data';
var tmpDir = dataDir + '/tmp';

function download(cb) {

	var downloadUrl = 'https://geolite.maxmind.com/download/geoip/database/GeoLite2-Country-CSV.zip';
	var fileName = path.basename(url.parse(downloadUrl).pathname);
	var file = path.join(tmpDir, fileName);

	fs.stat(file, function(error) {

		if (!error) {
			// File already exists.
			return cb();
		}

		console.log('Downloading...');

		var req = https.get(downloadUrl, function(res) {

			res.pipe(fs.createWriteStream(file))
				.on('error', cb)
				.on('close', function() {
					cb();
				});
		});

		req.on('error', cb);
	});
}

function extract(cb) {

	console.log('Extracting...');

	// Unzip and grab the files that we need.

	var zipArchive = tmpDir + '/GeoLite2-Country-CSV.zip';

	var fileNames = [
		'GeoLite2-Country-Blocks-IPv4.csv',
		'GeoLite2-Country-Blocks-IPv6.csv',
		'GeoLite2-Country-Locations-en.csv',
		'COPYRIGHT.txt',
		'LICENSE.txt'
	];

	var extracted = {};

	cb = _.once(cb);

	function done(error, fileName) {

		if (error) {
			return cb(error);
		}

		extracted[fileName] = true;

		if (allFilesExtracted()) {
			return cb();
		}
	}

	function allFilesExtracted() {

		return _.every(fileNames, function(fileName) {
			return extracted[fileName];
		});
	}

	yauzl.open(zipArchive, function(error, openedZipArchive) {

		if (error) {
			return done(error);
		}

		openedZipArchive.on('entry', function(entry) {

			var fileName = path.basename(entry.fileName);
			var isDirectory = /\/$/.test(fileName);

			if (!isDirectory && _.contains(fileNames, fileName)) {

				openedZipArchive.openReadStream(entry, function(error, readStream) {

					if (error) {
						return done(error);
					}

					var file = path.join(tmpDir, fileName);

					fs.stat(file, function(error) {

						if (!error) {
							// File already exists.
							return done(null, fileName);
						}

						readStream.pipe(fs.createWriteStream(file))
							.on('error', cb)
							.on('close', function() {
								done(null, fileName);
							});
					});
				});
			}
		});
	});
}

function process(cb) {

	console.log('Processing...');

	async.parallel({
		countryBlocksIpv4: processCountryBlocksIpv4,
		countryBlocksIpv6: processCountryBlocksIpv6,
		countryLocations: processCountryLocations
	}, cb);
}

function processCountryBlocksIpv4(cb) {

	var file = path.join(tmpDir, 'GeoLite2-Country-Blocks-IPv4.csv');
	var countryBlocksIpv4 = [];

	lazy(fs.createReadStream(file))
		.lines
		.map(function(byteArray) {
			return (new Buffer(byteArray)).toString('utf8');
		})
		.skip(1)
		.map(function(line) {

			var data = line.split(',');

			if (!data || data.length < 2) {
				console.error('[ERROR]', 'Bad line:', line);
				return;
			}

			var geonameId = parseInt(data[1].replace(/"/g, ''));
			var ipv4Cidr = data[0].replace(/"/g, '');
			var ipv4Address = new Address4(ipv4Cidr);
			var ipv4StartAddress = ipv4Address.startAddress().correctForm();
			var ipv4EndAddress = ipv4Address.endAddress().correctForm();

			var block = {
				geoname_id: geonameId,
				ipv4_start_int: utils.ipv4ToInt(ipv4StartAddress)
			};

			if (ipv4StartAddress !== ipv4EndAddress) {

				block.ipv4_end_int = utils.ipv4ToInt(ipv4EndAddress);
			}

			countryBlocksIpv4.push(block);
		})
		.on('pipe', function() {

			cb(null, countryBlocksIpv4);
		});
}

function processCountryBlocksIpv6(cb) {

	var file = path.join(tmpDir, 'GeoLite2-Country-Blocks-IPv6.csv');
	var countryBlocksIpv6 = [];

	lazy(fs.createReadStream(file))
		.lines
		.map(function(byteArray) {
			return (new Buffer(byteArray)).toString('utf8');
		})
		.skip(1)
		.map(function(line) {

			var data = line.split(',');

			if (!data || data.length < 2) {
				console.error('[ERROR]', 'Bad line:', line);
				return;
			}

			var geonameId = parseInt(data[1].replace(/"/g, ''));
			var ipv6Cidr = data[0].replace(/"/g, '');
			var ipv6Address = new Address6(ipv6Cidr);
			var ipv6StartAddress = ipv6Address.startAddress().correctForm();
			var ipv6EndAddress = ipv6Address.endAddress().correctForm();

			var block = {
				geoname_id: geonameId,
				ipv6_start_int_arr: utils.ipv6ToIntArray(ipv6StartAddress)
			};

			if (ipv6StartAddress !== ipv6EndAddress) {

				block.ipv6_end_int_arr = utils.ipv6ToIntArray(ipv6EndAddress);
			}

			countryBlocksIpv6.push(block);
		})
		.on('pipe', function() {

			cb(null, countryBlocksIpv6);
		});
}

function processCountryLocations(cb) {

	var file = path.join(tmpDir, 'GeoLite2-Country-Locations-en.csv');
	var countryLocations = {};

	lazy(fs.createReadStream(file))
		.lines
		.map(function(byteArray) {
			return (new Buffer(byteArray)).toString('utf8');
		})
		.skip(1)
		.map(function(line) {

			var data = line.split(',');

			if (!data || data.length < 2) {
				console.error('[ERROR]', 'Bad line:', line);
				return;
			}

			var geonameId = parseInt(data[0].replace(/"/g, ''));
			var isoCode = data[4].replace(/"/g, '').toLowerCase();

			countryLocations[geonameId] = isoCode;
		})
		.on('pipe', function() {

			cb(null, countryLocations);
		});
}

function buildDataFiles(data, cb) {

	async.parallel([
		_.bind(buildIpv4DataFile, undefined, data),
		_.bind(buildIpv6DataFile, undefined, data)
	], function(error) {

		if (error) {
			return cb(error);
		}

		cb();
	});
}

function buildIpv4DataFile(data, cb) {

	var json = _.map(data.countryBlocksIpv4, function(item) {

		var block = {
			c: data.countryLocations[item.geoname_id],
			s: item.ipv4_start_int
		};

		if (item.ipv4_end_int) {
			block.e = item.ipv4_end_int;
		}

		return block;
	});

	var file = path.join(dataDir, 'country-ipv4.json');

	fs.writeFile(file, JSON.stringify(json), 'utf8', cb);
}

function buildIpv6DataFile(data, cb) {

	var json = _.map(data.countryBlocksIpv6, function(item) {

		var block = {
			c: data.countryLocations[item.geoname_id],
			s: item.ipv6_start_int_arr
		};

		if (item.ipv6_end_int_arr) {
			block.e = item.ipv6_end_int_arr;
		}

		return block;
	});

	var file = path.join(dataDir, 'country-ipv6.json');

	fs.writeFile(file, JSON.stringify(json), 'utf8', cb);
}

function moveTmpFilesToDataDir(cb) {

	var tmpFileNames = [
		'COPYRIGHT.txt',
		'LICENSE.txt'
	];

	async.each(tmpFileNames, function(tmpFileName, next) {

		var tmpFile = path.join(tmpDir, tmpFileName);
		var file = path.join(dataDir, tmpFileName);

		fs.rename(tmpFile, file, next);

	}, function(error) {

		if (error) {
			return cb(error);
		}

		cb();
	});
}

function cleanup(cb) {

	fs.stat(tmpDir, function(error) {

		if (error) {
			// Temp directory doesn't exist.
			return cb();
		}

		fs.readdir(tmpDir, function(error, files) {

			files = _.map(files, function(file) {
				return tmpDir + '/' + file;
			});

			async.each(files, fs.unlink.bind(fs), function(error) {

				if (error) {
					return cb(error);
				}

				fs.rmdir(tmpDir, cb);
			});
		});
	});
}

function update(cb) {

	async.seq(setup, download, extract, process, buildDataFiles, moveTmpFilesToDataDir, cleanup)(cb);
}

function setup(cb) {

	async.series([
		createDirectoryIfDoesNotExist.bind(undefined, dataDir),
		createDirectoryIfDoesNotExist.bind(undefined, tmpDir)
	], function(error) {

		if (error) {
			return cb(error);
		}

		cb();
	});
}

function createDirectoryIfDoesNotExist(dir, cb) {

	fs.stat(dir, function(error) {

		if (!error) {
			// Already exists.
			return cb();
		}

		fs.mkdir(dir, cb);
	});
}

module.exports = {
	_dataDir: dataDir,
	_tmpDir: tmpDir,
	cleanup: cleanup,
	download: download,
	extract: extract,
	process: process,
	update: update,
	setup: setup
};
