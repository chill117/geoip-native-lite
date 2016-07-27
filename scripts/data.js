'use strict';

var fs = require('fs');
var program = require('commander');

var packageInfo = JSON.parse(fs.readFileSync(__dirname + '/../package.json', 'utf8'));
var lib = require('../lib');

program.version(packageInfo.version);
program.command('update').description('rebuild geo-ip data files');
program.action(function(cmd) {

	if (cmd) {

		lib.data[cmd](function(error) {

			if (error) {
				console.error('[ERROR]', error.message);
				return process.exit(1);
			}

			console.log('Done!');
			process.exit(0);
		});
	}
});

program.parse(process.argv);
