'use strict';

var parseArgs = require('minimist');
var process = require('process');
var assert = require('assert');
var fs = require('fs');
var console = require('console');
var path = require('path');
var os = require('os');
var DebugLogtron = require('debug-logtron');

var ThriftRepository = require('../thrift-repository.js');

module.exports = ThriftGod;

if (require.main === module) {
    var argv = parseArgs(process.argv.slice(2));
    var thriftGod = ThriftGod(argv);
    thriftGod.bootstrap(function onFini(err) {
        if (err) {
            console.error('ERR: ', err);
            process.exit(1);
        }
    });
}

/*eslint no-console: 0, no-process-exit: 0 */
function ThriftGod(opts) {
    if (!(this instanceof ThriftGod)) {
        return new ThriftGod(opts);
    }

    var self = this;

    self.opts = opts;
    if (opts.h || opts.help) {
        return self.help();
    }

    self.logger = opts.logger || DebugLogtron('thriftgod');
    self.configFile = opts['config-file'] || opts.configFile;
    assert(self.configFile, '--config-file is required');

    self.config = null;
    self.thriftRepo = null;
}

ThriftGod.prototype.bootstrap = function bootstrap(cb) {
    var self = this;

    fs.readFile(self.configFile, 'utf8', onConfig);

    function onConfig(err, content) {
        if (err) {
            return cb(err);
        }

        var data = JSON.parse(content);

        self.config = ThriftGodConfig(data);
        self.thriftRepo = ThriftRepository({
            remotes: self.config.remotes,
            upstream: self.config.upstream,
            repositoryFolder: self.config.repositoryFolder,
            logger: self.logger
        });

        self.thriftRepo.bootstrap(onBootstrap);
    }

    function onBootstrap(err) {
        if (err) {
            return cb(err);
        }

        /* TODO: run cron ? */
        cb(null);
    }
};

ThriftGod.prototype.help = function help() {
    console.log('usage: thrift-god [--help] [-h]');
    console.log('                  --config-file=<file>');
};

function ThriftGodConfig(data) {
    if (!(this instanceof ThriftGodConfig)) {
        return new ThriftGodConfig(data);
    }

    var self = this;

    assert(typeof data === 'object' && data,
        'config file must be a json object');
    assert(data.remotes && Array.isArray(data.remotes),
        'must configure `remotes`');
    assert(data.upstream && typeof data.upstream === 'string',
        'must configure `upstream`');

    self.remotes = data.remotes;
    self.upstream = data.upstream;

    if (typeof data.repositoryFolder === 'string') {
        self.repositoryFolder = data.repositoryFolder;
    } else {
        self.repositoryFolder = path.join(
            os.tmpDir(),
            'thrift-god',
            new Date().toISOString()
        );
    }
}
