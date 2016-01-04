#!/var/node/bin/node
var util = require('util'),
	events = require('events'),
	MongoClient = require('mongodb').MongoClient,
	spawn = require('child_process').spawn;

// start an eventEmitter
var eventEmitter = new events.EventEmitter();

// grab the date passed in, or set to today
var args = process.argv.slice(2);
console.log('args:',args[0]);
var reportWeek = new Date(2015, 11, 1);

// assumes we have downloaded the remote mongodump backup
var restore = spawn('mongorestore', ['-d', 'sally', 'dump/sally']); // '--drop',

restore.on('exit', function(exitCode){
	console.log('Restore completed, exit code:', exitCode);

	MongoClient.connect('mongodb://localhost:27017/sally', function(err, db) {
		if (db) {
			var articles = db.collection('articles');
			var queryResults = [];

			// grab all articles with a createdAt property
			var cursor = articles.find({createdAt: {$ne: null}}).addCursorFlag('noCursorTimeout', true);

			cursor.count(function(err, count) {
				var savesPending = count;
				console.log("articles to update:", count);

				var saveFinished = function(){
					savesPending--;
					if(savesPending == 0){
						eventEmitter.emit('ready to query');
					}
				};

				cursor.each(function (err, doc) {
					if(doc != null) {
						var noMS = doc.createdAt;
						if (noMS instanceof Date === false && noMS != null) {
							var ISODate = new Date(noMS.replace('Z', '.000Z'));
							articles.updateOne({_id: doc._id}, {$set: {createdAt: ISODate}}, function (err, result) {
								if (err) {
									console.log("Update failed:", err);
								}
								if (result) {
									saveFinished();
								}
							});
						} else { // in case ISODate format was already in place
							saveFinished();
						}
					}
				});
			});

		} else {
			console.log('Unable to connect to the mongoDB server. Error:', err);
		}

		// CUSTOM EVENTS
		// run queries
		eventEmitter.on('ready to query', function() {
			console.log('running queries');

			var queryArray = [allDates, thisWeek(reportWeek)];
			var queriesPending = queryArray.length;

			var queryComplete = function(){
				queriesPending--;
				if(queriesPending == 0){
					eventEmitter.emit('complete');
				}
			};

			(function(arr) {
				for(var i = 0, count = arr.length; i < count; i++) {
					articles.aggregate(arr[i], function(err, result){
						if (err) {
							console.log("Query failed:", err);
						}
						if (result) {
							queryResults.push(result);
							queryComplete();
						}
					});
				}
			})(queryArray);
		});

		// format for display
		eventEmitter.on('complete', function() {
			console.log(queryResults);
			console.log(Object.getOwnPropertyNames(queryResults[1][0]));
			db.close();
			eventEmitter.emit('send email');
		});

		// send email
		eventEmitter.on('send email', function() {
			console.log('ready to send');
			process.exit(0);
		});
	});
});

// query back to the beginning
var allDates = [
	{
		$match: {
			"raw.siteCode": {$nin: ['cosuk','dsuk',null]},
			channelId: {$nin: [
				'463ede6a-1992-4d35-be60-884f8d8b502e', // sandboxes
				'4a2fecfd-f2bf-4002-adaa-f9c1b9febcb9',
				'1f21029c-f901-4831-b5a6-de97effc69ba',
				'4c81d37a-59ff-4b9c-b003-10f448213d7f', // cos UK
				'a57e35f0-0897-4e03-ae3f-5641b0b364c1' // digital spy
			]},
			createdAt: {$ne: null}
		}
	},
	{
		$sort: {
			createdAt: 1
		}
	},
	{
		$group: {
			_id: { site: "$raw.siteCode", hasGallery: "$raw.hasGallery" },
			firstArticle: { $first: "$createdAt"},
			count: { $sum: 1 }
		}
	},
	{
		$project: {
			_id: 0,
			SiteCode: '$_id.site',
			ContentType: '$_id.hasGallery',
			PubCount: '$count',
			LaunchDate: { $dateToString: { format: "%m-%d-%Y", date: "$firstArticle" } },
			WeeksRunning: { $divide: [{ $subtract: [ new Date(), "$firstArticle" ] }, 1000 * 7 * 24 * 60 * 60] }
		}
	},
	{
		$sort: {
			SiteCode: 1,
			ContentType: 1
		}
	}
];

// query from start of week - pass new Date(2015, 10, 30);
var thisWeek = function(date) {
	var start = weekStart(date),
		end = weekEnd(date);
	return [
		{
			$match: {
				"raw.siteCode": {$nin: ['cosuk','dsuk',null]},
				channelId: {$nin: [
					'463ede6a-1992-4d35-be60-884f8d8b502e', // sandboxes
					'4a2fecfd-f2bf-4002-adaa-f9c1b9febcb9',
					'1f21029c-f901-4831-b5a6-de97effc69ba',
					'4c81d37a-59ff-4b9c-b003-10f448213d7f', // cos UK
					'a57e35f0-0897-4e03-ae3f-5641b0b364c1' // digital spy
				]},
				createdAt: { $gte: new Date(start), $lte: new Date(end) },
			}
		},
		{
			$group: {
				_id: { site: "$raw.siteCode", hasGallery: "$raw.hasGallery" },
				count: { $sum:1 }
			}
		},
		{
			$project: {
				_id: 0,
				SiteCode: '$_id.site',
				ContentType: '$_id.hasGallery',
				PubCount: '$count'
			}
		},
		{
			$sort: {
				SiteCode: 1,
				ContentType: 1
			}
		}
	]
};

// date functions
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


