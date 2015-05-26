'use strict';

var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');

var gitexec = require('./git-exec.js');

module.exports = RemoteCache;

function RemoteCache(opts) {
    if (!(this instanceof RemoteCache)) {
        return new RemoteCache(opts);
    }

    var self = this;

    self.cacheLocation = opts.cacheLocation;
    self.logger = opts.logger;

    self.cacheDirExists = false;
}

/*
    if not cacheLocation/{remoteName} {
        initialLoad()
    } else {
        pullAndUpdate()
    }
*/
RemoteCache.prototype.fetchThriftFile =
function fetchThriftFile(remote, callback) {
    var self = this;

    if (self.cacheDirExists) {
        checkRemoteFolder();
    } else {
        mkdirp(self.cacheLocation, onCacheLocationMade);
    }

    function onCacheLocationMade(err) {
        if (err) {
            return callback(err);
        }

        self.cacheDirExists = true;
        checkRemoteFolder();
    }

    function checkRemoteFolder() {
        var folder = path.join(self.cacheLocation, remote.folderName);
        fs.exists(folder, onExists);
    }

    function onExists(exists) {
        if (!exists) {
            self._initialLoad(remote, callback);
        } else {
            // TODO implement
            self._pullAndUpdate(remote, callback);
        }
    }
};

// git clone --no-checkout --depth 1 remote folderName
RemoteCache.prototype._initialLoad =
function _initialLoad(remote, callback) {
    var self = this;

    var cwd = self.cacheLocation;

    var command = 'git clone ' +
        '--no-checkout ' +
        '--depth 1 ' +
        remote.repository + ' ' +
        remote.folderName;
    gitexec(command, {
        cwd: cwd,
        logger: self.logger,
        ignoreStderr: true
    }, onCloned);

    function onCloned(err, stdout, stderr) {
        if (err) {
            self.logger.error('git clone remote failed', {
                err: err,
                stderr: stderr,
                remote: remote
            });
            return callback(err);
        }

        self._showThriftFile(remote, callback);
    }
};

// git show HEAD:thrift/service.thrift
RemoteCache.prototype._showThriftFile =
function _showThriftFile(remote, callback) {
    var self = this;

    var cwd = path.join(self.cacheLocation, remote.folderName);

    var command = 'git show HEAD:thrift/service.thrift';
    gitexec(command, {
        cwd: cwd,
        logger: self.logger
    }, onGitShow);

    function onGitShow(err, stdout, stderr) {
        if (err) {
            // TODO handle repos without thrift files
            self.logger.error('git show thrift file failed', {
                err: err,
                stderr: stderr,
                remote: remote
            });
            return callback(err);
        }

        callback(null, String(stdout));
    }
};