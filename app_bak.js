#!/var/node/bin/node
var util = require('util');
var mongodb = require('mongodb');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;

var spawnArgs = ['-fN', '-L', '27017:localhost:27017', '-i', '/Users/jzinn/.ssh/sally', 'ec2-user@sally.hdmtech.net'];
var ssh = spawn('ssh', spawnArgs);
ssh.stderr.on('data', function (data) {
	console.log('stderr: ' + data);
});

// mongodump the remote db
var dump = spawn('mongodump', ['-d', 'sally', '-c', 'articles']);
dump.stderr.on('data', function (data) {
	console.log('We received a reply: ' + data);
});
dump.on('exit', function (exitCode) {
	console.log("Dump complete, killing connection (exitcode:" + exitCode + ")");
	spawn('killall',['ssh']);
	spawn('mongod');
});



//exec('mongorestore --drop -d sally -c articles dump/sally/articles.bson', function(error, stdout, stderr) {
//	console.log('stdout: ' + stdout);
//	console.log('stderr: ' + stderr);
//	if (error !== null) {
//		console.log('exec error: ' + error);
//	}
//});

//exec('killall ssh', function(error, stdout, stderr) {
//	console.log('stdout: ' + stdout);
//	console.log('stderr: ' + stderr);
//	if (error !== null) {
//		console.log('exec error: ' + error);
//	}
//});

var mydate = new Date(2015, 10, 30);

function weekStart(d) {
	d = new Date(d);
	d.setHours(0,0,0,0); // midnight
	var day = d.getDay(),
		diff = d.getDate() - day;
	return new Date(d.setDate(diff));
}

function weekEnd(d) {
	d = new Date(d);
	d.setHours(23,59,59,999); // 23:59:59.999
	var day = d.getDay(),
		diff = d.getDate() + (6 - day);
	return new Date(d.setDate(diff));
}


