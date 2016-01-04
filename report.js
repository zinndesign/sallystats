use sally;

// find oldest
db.articles.find({createdAt:{$ne:null},'raw.siteCode':'cos'},{'raw.siteCode':1,createdAt:1,_id:0}).sort({createdAt:1}).limit(10).pretty();

db.articles.createIndex({createdAt:1})

// find total published, exclude UK and sandboxes
db.articles.count({
			"raw.siteCode": {$nin: ['cosuk','dsuk',null]},
			channelId: {$nin: [
				'463ede6a-1992-4d35-be60-884f8d8b502e',
				'4a2fecfd-f2bf-4002-adaa-f9c1b9febcb9',
				'1f21029c-f901-4831-b5a6-de97effc69ba',
				'4c81d37a-59ff-4b9c-b003-10f448213d7f', // cosUK
				'a57e35f0-0897-4e03-ae3f-5641b0b364c1' // digital spy
				]},
			createdAt: {$ne: null}
		})

// update the format of the metadata.datePublished field to valid ISODate;
// otherwise the date comparison can't be made
var cursor = db.articles.find()
while (cursor.hasNext()) {
	var doc = cursor.next();
	var noMS = doc.modifiedAt;
	if (noMS instanceof Date === false && noMS != null) {
		db.articles.update({_id : doc._id}, {$set : {'modifiedAt' : ISODate(noMS.replace('Z','.000Z'))}});
	}
}

// run the query for a specified range
var start = '2015-11-29T00:00:00.000Z', end = '2015-12-05T23:59:59.999Z';
db.articles.aggregate([
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
			createdAt: { $gte:ISODate(start), $lte:ISODate(end) },
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
			site: '$_id.site',
			is_gallery: '$_id.hasGallery',
			pubcount: '$count'
		}
	},
	{
		$sort: {
			site:1,
			is_gallery:1
		}
	}
])

// all titles except UK, plus weeks running
db.articles.aggregate([
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
			createdAt:1
		}
	},
	{
		$group: {
			_id: { site: "$raw.siteCode", hasGallery: "$raw.hasGallery" },
			firstArticle: { $first: "$createdAt"},
			count: { $sum:1 }
		}
	},
	{
		$project: {
			_id: 0,
			site: '$_id.site',
			is_gallery: '$_id.hasGallery',
			pubcount: '$count',
			launch: { $dateToString: { format: "%m-%d-%Y", date: "$firstArticle" } },
			weeks: { $divide: [{ $subtract: [ new Date(), "$firstArticle" ] }, 1000 * 7 * 24 * 60 * 60] }
		}
	},
	{
		$sort: {
			site:1,
			is_gallery:1
		}
	}
])