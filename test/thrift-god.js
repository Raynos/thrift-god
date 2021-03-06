'use strict';

var TestCluster = require('./lib/test-cluster.js');

TestCluster.test('run the thrift-god', {
    config: {}
}, function t(cluster, assert) {
    cluster.inspectUpstream(onUpstream);

    function onUpstream(err, data) {
        assert.ifError(err);

        assert.equal(data.thrift,
            'tree HEAD:thrift\n' +
            '\n' +
            'A.thrift\n' +
            'B.thrift\n' +
            'C.thrift\n' +
            'D.thrift\n'
        );
        assert.equal(data.gitlog,
            'Updating D to latest version ' +
                'cf9c2141b3dbb05bcbaa31579b883697d42c7f8d\n' +
            'Updating C to latest version ' +
                '484742978a072e46ae1131d8efe7fe0377d35c54\n' +
            'Updating B to latest version ' +
                '424a6ca9b4660bf432045eeba7a3254ab38d5701\n' +
            'Updating A to latest version ' +
                'd329c8c24d0871076a5f05180a439bccb9bebe71\n' +
            'initial\n'
        );

        assert.equal(data.meta.time,
            data.meta.remotes.D.time);
        assert.equal(new Date(data.meta.time).getTime(),
            data.meta.version);

        assert.equal(data.meta.remotes.A.sha,
            'd329c8c24d0871076a5f05180a439bccb9bebe71');
        assert.equal(data.meta.remotes.B.sha,
            '424a6ca9b4660bf432045eeba7a3254ab38d5701');
        assert.equal(data.meta.remotes.C.sha,
            '484742978a072e46ae1131d8efe7fe0377d35c54');
        assert.equal(data.meta.remotes.D.sha,
            'cf9c2141b3dbb05bcbaa31579b883697d42c7f8d');

        assert.deepEqual(data.remotes, {
            'A':
                'service A {\n' +
                '    i32 echo(1:i32 value)\n' +
                '}\n',
            'B':
                'service B {\n' +
                '    i32 echo(1:i32 value)\n' +
                '}\n',
            'C':
                'service C {\n' +
                '    i32 echo(1:i32 value)\n' +
                '}\n',
            'D':
                'service D {\n' +
                '    i32 echo(1:i32 value)\n' +
                '}\n'
        });

        var remotes = data.meta.remotes;
        assert.equal(data.gittag, '' +
            'v' + new Date(remotes.A.time).getTime() + '\n' +
            'v' + new Date(remotes.B.time).getTime() + '\n' +
            'v' + new Date(remotes.C.time).getTime() + '\n' +
            'v' + new Date(remotes.D.time).getTime() + '\n'
        );

        assert.end();
    }
});

TestCluster.test('run with branches', {
    remoteRepos: {
        'E': {
            branch: 'foo',
            files: {
                'thrift': {
                    'service.thrift': '' +
                        'service E {\n' +
                        '    i32 echo(1:i32 value)\n' +
                        '}\n'
                }
            }
        }
    }
}, function t(cluster, assert) {
    cluster.inspectUpstream(onUpstream);

    function onUpstream(err, data) {
        assert.ifError(err);

        assert.equal(data.thrift,
            'tree HEAD:thrift\n' +
            '\n' +
            'A.thrift\n' +
            'B.thrift\n' +
            'C.thrift\n' +
            'D.thrift\n' +
            'E.thrift\n'
        );

        assert.equal(
            data.remotes.E,
            'service E {\n' +
            '    i32 echo(1:i32 value)\n' +
            '}\n'
        );

        assert.end();
    }
});

TestCluster.test('run with custom localFileName', {
    remoteRepos: {
        'E': {
            branch: 'master',
            localFileName: 'thrift/foo.thrift',
            files: {
                'thrift': {
                    'foo.thrift': '' +
                        'service E {\n' +
                        '    i32 echo(1:i32 value)\n' +
                        '}\n'
                }
            }
        }
    }
}, function t(cluster, assert) {
    cluster.inspectUpstream(onUpstream);

    function onUpstream(err, data) {
        assert.ifError(err);

        assert.equal(data.thrift,
            'tree HEAD:thrift\n' +
            '\n' +
            'A.thrift\n' +
            'B.thrift\n' +
            'C.thrift\n' +
            'D.thrift\n' +
            'E.thrift\n'
        );

        assert.equal(
            data.remotes.E,
            'service E {\n' +
            '    i32 echo(1:i32 value)\n' +
            '}\n'
        );

        assert.end();
    }
});

TestCluster.test('run without thrift file', {
    remoteRepos: {
        'E': {
            localFileName: 'thrift/no.thrift',
            files: {
                'thrift': {
                    'empty.thrift': ''
                }
            }
        }
    },
    prepareOnly: true
}, function t(cluster, assert) {
    cluster.logger.whitelist('warn', 'git output');
    cluster.logger.whitelist('warn', 'git show thrift file failed');

    cluster.setupThriftGod(onSetup);

    function onSetup(err) {
        assert.ifError(err);

        cluster.inspectUpstream(onUpstream);
    }

    function onUpstream(err, data) {
        assert.ifError(err);

        var items = cluster.logger.items();
        assert.equal(items.length, 2);

        assert.equal(items[0].fields.msg, 'git output');
        assert.equal(items[1].fields.msg,
            'git show thrift file failed');
        assert.equal(items[1].fields.stderr,
            'fatal: Path \'thrift/no.thrift\' does not ' +
                'exist in \'HEAD\'\n');

        assert.equal(data.thrift,
            'tree HEAD:thrift\n' +
            '\n' +
            'A.thrift\n' +
            'B.thrift\n' +
            'C.thrift\n' +
            'D.thrift\n' +
            'E.thrift\n'
        );

        assert.equal(data.remotes.E, '');

        assert.end();
    }
});

TestCluster.test('running thrift-god twice', {
    prepareOnly: true
}, function t(cluster, assert) {
    cluster.setupThriftGod(onSetup);

    function onSetup(err) {
        assert.ifError(err);

        cluster.setupThriftGod(onSetup2);
    }

    function onSetup2(err) {
        assert.ifError(err);

        cluster.inspectUpstream(onUpstream);
    }

    function onUpstream(err, data) {
        assert.ifError(err);

        assert.equal(data.thrift,
            'tree HEAD:thrift\n' +
            '\n' +
            'A.thrift\n' +
            'B.thrift\n' +
            'C.thrift\n' +
            'D.thrift\n'
        );
        assert.equal(data.gitlog,
            'Updating D to latest version ' +
                'cf9c2141b3dbb05bcbaa31579b883697d42c7f8d\n' +
            'Updating C to latest version ' +
                '484742978a072e46ae1131d8efe7fe0377d35c54\n' +
            'Updating B to latest version ' +
                '424a6ca9b4660bf432045eeba7a3254ab38d5701\n' +
            'Updating A to latest version ' +
                'd329c8c24d0871076a5f05180a439bccb9bebe71\n' +
            'initial\n'
        );

        assert.equal(data.meta.time,
            data.meta.remotes.D.time);
        assert.equal(new Date(data.meta.time).getTime(),
            data.meta.version);

        assert.equal(data.meta.remotes.A.sha,
            'd329c8c24d0871076a5f05180a439bccb9bebe71');
        assert.equal(data.meta.remotes.B.sha,
            '424a6ca9b4660bf432045eeba7a3254ab38d5701');
        assert.equal(data.meta.remotes.C.sha,
            '484742978a072e46ae1131d8efe7fe0377d35c54');
        assert.equal(data.meta.remotes.D.sha,
            'cf9c2141b3dbb05bcbaa31579b883697d42c7f8d');

        assert.end();
    }
});

TestCluster.test('updating a remote', {
    config: {}
}, function t(cluster, assert) {
    cluster.updateRemote('B', {
        thrift: {
            'service.thrift': '' +
                'service B {\n' +
                '    i32 echo(1:i32 value)\n' +
                '    i64 echo64(1:i64 value)\n' +
                '}\n'
        }
    }, onUpdated);

    function onUpdated(err) {
        assert.ifError(err);

        cluster.timers.advance(30 * 1000 + 5);
        cluster.thriftGod.once('fetchedRemotes', onRemotes);
    }

    function onRemotes() {
        cluster.inspectUpstream(onUpstream);
    }

    function onUpstream(err, data) {
        assert.ifError(err);

        assert.equal(data.thrift,
            'tree HEAD:thrift\n' +
            '\n' +
            'A.thrift\n' +
            'B.thrift\n' +
            'C.thrift\n' +
            'D.thrift\n'
        );
        assert.equal(data.gitlog,
            'Updating B to latest version ' +
                'e1359a7f03df1988e8c11b85fe7b59df16ee2806\n' +
            'Updating D to latest version ' +
                'cf9c2141b3dbb05bcbaa31579b883697d42c7f8d\n' +
            'Updating C to latest version ' +
                '484742978a072e46ae1131d8efe7fe0377d35c54\n' +
            'Updating B to latest version ' +
                '424a6ca9b4660bf432045eeba7a3254ab38d5701\n' +
            'Updating A to latest version ' +
                'd329c8c24d0871076a5f05180a439bccb9bebe71\n' +
            'initial\n'
        );

        assert.equal(data.meta.time,
            data.meta.remotes.B.time);
        assert.equal(new Date(data.meta.time).getTime(),
            data.meta.version);

        assert.equal(data.meta.remotes.A.sha,
            'd329c8c24d0871076a5f05180a439bccb9bebe71');
        assert.equal(data.meta.remotes.B.sha,
            'e1359a7f03df1988e8c11b85fe7b59df16ee2806');
        assert.equal(data.meta.remotes.C.sha,
            '484742978a072e46ae1131d8efe7fe0377d35c54');
        assert.equal(data.meta.remotes.D.sha,
            'cf9c2141b3dbb05bcbaa31579b883697d42c7f8d');

        assert.deepEqual(data.remotes, {
            'A':
                'service A {\n' +
                '    i32 echo(1:i32 value)\n' +
                '}\n',
            'B':
                'service B {\n' +
                '    i32 echo(1:i32 value)\n' +
                '    i64 echo64(1:i64 value)\n' +
                '}\n',
            'C':
                'service C {\n' +
                '    i32 echo(1:i32 value)\n' +
                '}\n',
            'D':
                'service D {\n' +
                '    i32 echo(1:i32 value)\n' +
                '}\n'
        });

        var remotes = data.meta.remotes;
        var tags = data.gittag.trim().split('\n');

        assert.equal(tags[0], 'v' + new Date(remotes.A.time).getTime());
        assert.equal(tags[2], 'v' + new Date(remotes.C.time).getTime());
        assert.equal(tags[3], 'v' + new Date(remotes.D.time).getTime());
        assert.equal(tags[4], 'v' + new Date(remotes.B.time).getTime());

        assert.end();
    }
});
