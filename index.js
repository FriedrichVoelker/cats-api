const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require("dotenv").config();
const { randomBytes } = require('crypto');
const fs = require('fs');
const http = require('http');

// get request
const get = async (url) => {
	const response = await fetch(url, {
		headers: {"Authorization":" Bearer " + process.env.TWITTER_API_KEY}
	});
	return await response.json();
};

const getJPG = async (url) => {
	const response = await fetch(url, {
		headers: {"Authorization":" Bearer " + process.env.TWITTER_API_KEY}
	});
	return response
}


const server = http.createServer(async (req, res) => {
	const url = req.url;

	const clientDomain = req.headers.host;


	if(url == "/"){
		// get all files in media folder
		const files = fs.readdirSync('./media');
		res.writeHead(200, {'Content-Type': 'text/html'});

		const html = files.map((file) => {
			return `<a href="/media/${file}">${file}</a><br/>`;
		}).join("");

		res.end(html);
		return;
	}

	// Api endpoint

	if(url == "/api/get"){
		getCats();
		res.writeHead(200, {'Content-Type': 'application/json'});
		res.end(JSON.stringify({"cats": "gotten"}));
		return;
	}

	if(url == "/api/cats"){
		const files = fs.readdirSync('./media');
		res.writeHead(200, {'Content-Type': 'application/json'});

		// get file size
		const cats = files.map((file) => {
			const stats = fs.statSync(`./media/${file}`);
			const fileSizeInBytes = stats.size;
			return {
				"name": file,
				"size": fileSizeInBytes
			}
		});

		let resp = []

		files.forEach((file) => {

			
			const stats = fs.statSync(`./media/${file}`);
			const fileSizeInBytes = stats.size;
			resp.push({
				"name": file,
				"size": fileSizeInBytes,
				"url": `http://${clientDomain}/media/${file}`,
				"created": stats.birthtime
			})

		})


		res.end(JSON.stringify(resp));
		return;
	}


	if(url == "/random"){
		res.writeHead(200, {'Content-Type': 'image/jpg'});

		const cat = await getRandomCat();
		let jpg = await getJPG(cat)
		jpg.arrayBuffer().then((buffer) => {
			res.end(Buffer.from(buffer));
		});
		return;
	}

	if(url.endsWith("/nocat")){
		res.writeHead(200, {'Content-Type': 'image/jpg'});

		const cat = await getRandomCat();
		let jpg = await getJPG(cat)
		jpg.arrayBuffer().then((buffer) => {
			res.end(Buffer.from(buffer));
		});
		return;
	}

	// if file exists
	if (fs.existsSync('.' + url)) {
		res.writeHead(200, {'Content-Type': 'image/jpeg'});
		res.end(fs.readFileSync('.' + url));
		return;
	}
	res.writeHead(200, {'Content-Type': 'image/jpg'});

	const cat = await getRandomCat();
	let jpg = await getJPG(cat)
	jpg.arrayBuffer().then((buffer) => {
		res.end(Buffer.from(buffer));
	});
	return;
})
server.listen(process.env.HTTP_PORT || 1257, () => {
	console.log('Server running at http://localhost:' + (process.env.HTTP_PORT || 1257) + '/');
});


async function getCats() {
	const data = await get(`https://api.twitter.com/2/tweets/search/recent?query=from:basostream has:media is:reply&tweet.fields=author_id&expansions=attachments.media_keys&media.fields=url`)
	// const data = {
	// 	"data": [
	// 	  {
	// 		"text": "@itsmahluna 🥰❤️✨ https://t.co/hZ3Po4AoM1",
	// 		"id": "1563646182223593472",
	// 		"attachments": {
	// 		  "media_keys": [
	// 			"3_1563646177991692288"
	// 		  ]
	// 		},
	// 		"author_id": "3005575467"
	// 	  },
	// 	  {
	// 		"text": "@xLumenti 🥰🥰🥰 https://t.co/1sLJThtNsn",
	// 		"id": "1562594123491979264",
	// 		"attachments": {
	// 		  "media_keys": [
	// 			"3_1562594119247171584"
	// 		  ]
	// 		},
	// 		"author_id": "3005575467"
	// 	  }
	// 	],
	// 	"includes": {
	// 	  "media": [
	// 		{
	// 		  "media_key": "3_1563646177991692288",
	// 		  "type": "photo",
	// 		  "url": "https://pbs.twimg.com/media/FbMv6hGXkAADA2S.jpg"
	// 		},
	// 		{
	// 		  "media_key": "3_1562594119247171584",
	// 		  "type": "photo",
	// 		  "url": "https://pbs.twimg.com/media/Fa9zEo3XkAA0PRh.jpg"
	// 		}
	// 	  ]
	// 	},
	// 	"meta": {
	// 	  "newest_id": "1563646182223593472",
	// 	  "oldest_id": "1562594123491979264",
	// 	  "result_count": 2
	// 	}
	//   }

	  data.includes.media.forEach(async (media) => {
		const {media_key, type, url} = media;
		
		// if folder doesnt exist
		if (!fs.existsSync('./media')) {
			fs.mkdirSync('./media');
		}

		// if file already exists, skip
		if (fs.existsSync(`./media/BasoStream_${media_key}.jpg`) || fs.existsSync(`./media/BasoStream_${media_key}.mp4`)) {
			return;
		}

		if (type === 'photo') {
			(await getJPG(url)).body.pipe(fs.createWriteStream(`./media/BasoStream_${media_key}.jpg`));
		} else {
			(await getJPG(url)).body.pipe(fs.createWriteStream(`./media/BasoStream_${media_key}.mp4`));
		}
		handleNewMedia(media);
		

	  })

}

const getRandomCat = async () => {
	let res = await get(`https://api.thecatapi.com/v1/images/search`);
	return res[0].url;
}

const handleNewMedia = async (media) => {
	const {media_key, type, url} = media;

	console.log(`New ${type || "media"}: ` + media_key)
};

// getCats()