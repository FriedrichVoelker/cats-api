const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require("dotenv").config();
const { clear } = require('console');
const formData = require('form-data');
const fs = require('fs');
const http = require('http');
const os = require('node:os');
const db = require('./util/db.js');

let interval;

// get request
const get = async (url) => {
	const response = await fetch(url, {
		headers: {"Authorization":" Bearer " + process.env.TWITTER_API_KEY}
	});
	try{
		return await response.json();
	}catch(e){
		console.log(e);
		return response;
	}
};

const getJPG = async (url) => {
	const response = await fetch(url, {
		headers: {"Authorization":" Bearer " + process.env.TWITTER_API_KEY}
	});
	return response
}

const getMedia = async (url) => {
	const response = await fetch(url);
	return response
}

const server = http.createServer(async (req, res) => {
	getCat();
	const now = new Date();
	let stopped = false;
	const url = req.url;
	const clientDomain = process.env.URL_DOMAIN;
	const scheme = process.env.URL_PROTOCOL || 'http';

	if(url == "/all"){
		const cats = await db.query("SELECT * FROM images");
		res.writeHead(200, {'Content-Type': 'text/html'});
		res.write(`<html><head><title>Cats</title></head><body style="margin:0px auto;text-align: center;padding:2rem;background-color: rgb(58, 58, 58);">`);
		cats.forEach((cat) => {
			res.write(`<img loading="lazy"  style="max-width:50%" src="/cat/${cat.uuid}" /><br><a style="color:rgb(185, 13, 13);" href="/cat/${cat.uuid}">${cat.uuid}</a><br><br>`);
		})
		res.write(`</body></html>`);
		res.end();
		return;
	}


	if(url == "/baso"){
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

	if(url == "/api/baso/get"){
		getCats();
		res.writeHead(200, {'Content-Type': 'application/json'});
		res.end(JSON.stringify({response_time: new Date().getTime() - now.getTime() + " ms","cats": "gotten"}));
		return;
	}

	if(url == "/api/baso"){
		const files = fs.readdirSync('./media');
		res.writeHead(200, {'Content-Type': 'application/json'});

		let resp = []

		files.forEach((file) => {

			
			const stats = fs.statSync(`./media/${file}`);
			const fileSizeInBytes = stats.size;
			resp.push({
				"name": file,
				"size": fileSizeInBytes,
				"url": `${scheme}://${clientDomain}/media/${file}`,
				"created": stats.birthtime
			})

		})


		res.end(JSON.stringify({response_time: new Date().getTime() - now.getTime() + " ms",cats:resp}));
		return;
	}

	if(url == "/api/all"){
		const cats = await db.query(`SELECT uuid, source, created_at FROM images`);

		let outcats = {}
		cats.forEach((cat) => {
			outcats[cat.uuid] = {
				"source": cat.source,
				"created": cat.created_at,
				"url": `${scheme}://${clientDomain}/cat/${cat.uuid}`
			};
		});

		res.writeHead(200, {'Content-Type': 'application/json'});
		outcats = {amount: cats.length, ...outcats};
		// Object.assign(outcats, {amount: outcats.length})
		res.end(JSON.stringify({response_time: new Date().getTime() - now.getTime() + " ms", cats: outcats}));
		return;
	}

	if(url == "/api/getcat/start"){
		clearInterval(interval);
		interval = setInterval(async () => {
			await getCat();
		} , 1000);
		res.writeHead(200, {'Content-Type': 'application/json'});
		res.end(JSON.stringify({response_time: new Date().getTime() - now.getTime() + " ms", "status": "started"}));
		return;
	}

	if(url == "/api/getcat/stop"){
		clearInterval(interval);
		res.writeHead(200, {'Content-Type': 'application/json'});
		res.end(JSON.stringify({response_time: new Date().getTime() - now.getTime() + " ms", "status": "stopped"}));
		return;
	}

	if(url == "/api/random"){
		let cat = await getRandomCatFromDB();
		cat = {
			"source": cat.source,
			"created": cat.created_at,
			"url": `${scheme}://${clientDomain}/cat/${cat.uuid}`
		}
		res.writeHead(200, {'Content-Type': 'application/json'});
		res.end(JSON.stringify({response_time: new Date().getTime() - now.getTime() + " ms", "cat": cat}));
		return;
	}

	// if file exists
	if (url != "/" && fs.existsSync('.' + url)) {
		res.writeHead(200, {'Content-Type': 'image/jpeg'});
		res.end(fs.readFileSync('.' + url));
		return;
	}


	// if uuid in db
	if(url.includes("/cat/")){
		const uuid = url.split("/cat/")[1];
		const cat = await db.query(`SELECT image FROM images WHERE uuid = ?`, [uuid]);
		if(cat.length > 0){
			stopped = true;
			res.writeHead(200, {'Content-Type': 'image/jpeg'});

			const buffer = cat[0].image;
			const jpg = Buffer.from(buffer, 'binary');
			res.end(jpg);
			return;
		}
	}

	if(url == "/random"){
		res.writeHead(200, {'Content-Type': 'image/jpeg'});

		const cat = await getRandomCatFromDB();

		const buffer = cat.image;
		const jpg = Buffer.from(buffer, 'binary');
		res.end(jpg);
		return;

	}

	if(!stopped){
		res.writeHead(200, {'Content-Type': 'text/html'});

		const cat = await getRandomCatFromDB();

		// const html = `<img style="margin-left:0px auto;margin-right:0px auto;" src="/cat/${cat.uuid}" alt="${cat.uuid}"><br/><a href="/cat/${cat.uuid}">${cat.uuid}</a>`;

		// get index.html
		let index = fs.readFileSync('./index.html', "utf8", function(data){return data});
		index = index.replaceAll("{{IMAGE_URL}}", "/cat/" +cat.uuid);
		index = index.replaceAll("{{UUID}}", cat.uuid);

		res.end(index);
		return;
		// let jpg = await getJPG(cat)
		// let arrBuff = await jpg.arrayBuffer();
		// storeCatsToMYSQL(arrBuff, cat)
		// res.end(Buffer.from(arrBuff));
		// return;
	}
})
server.listen(process.env.HTTP_PORT || 1257, () => {
	console.log('Server running at http://localhost:' + (process.env.HTTP_PORT || 1257) + '/');
});


async function getCats() {
	const data = await get(`https://api.twitter.com/2/tweets/search/recent?query=from:basostream has:media is:reply&tweet.fields=author_id&expansions=attachments.media_keys&media.fields=url`)

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
			const cat = await getJPG(url)
			
			let stream = cat.body.pipe(fs.createWriteStream(`./media/BasoStream_${media_key}.jpg`))
			stream.on("finish", () => {
				handleNewMedia(media);
			})
			

		} else {
			(await getJPG(url)).body.pipe(fs.createWriteStream(`./media/BasoStream_${media_key}.mp4`));
		}
		

	  })

}

const getRandomCat = async () => {
	if(Math.random() > 0.5){
		let res = await get(`https://api.thecatapi.com/v1/images/search`);
		return res[0].url;
	} else {
		let res = await get("https://cataas.com/cat?json=true")
		return "https://cataas.com" +  res.url;
	}
}

const handleNewMedia = async (media) => {
	const {media_key, type, url} = media;


	const form = new formData();
	form.append('file1', fs.createReadStream(`./media/BasoStream_${media_key}.jpg`)); // give absolute path if possible
	form.append('content', '@everyone 🐱📷✨')
	form.append('username', "Baso")
	form.append("avatar", "https://pbs.twimg.com/profile_images/1484871121921093638/Yet8n1j__400x400.jpg")

	fetch(process.env.DISCORD_WEBHOOK_URL, {
		'method': 'POST',
		'body': form,
		headers: form.getHeaders()
	})
	.catch(err => console.error(err));
};


setInterval(async () => {
	await getCats();
}, 1000 * 60 * 15);

const getRandomCatFromDB = async () => {
	const cat = await db.query(`SELECT * FROM images ORDER BY RAND() LIMIT 1`);
	return cat[0];
}

const storeCatsToMYSQL = async (arrayBuffer, url) => {
	const buffer=Buffer.from(arrayBuffer,'binary');
	await db.query(`INSERT INTO images (uuid, image, source, created_at) VALUES (UUID(), ?, ?, NOW()) ON DUPLICATE KEY UPDATE created_at = NOW()`, [buffer, url, url]);
	// console.log(quer)
}


const getCat = async () => {
	let url = await getRandomCat();
	let jpg = await getMedia(url)

	let blob = await jpg.arrayBuffer();

	storeCatsToMYSQL(blob, url)
}
getCat()


// get data from static/cats.json
const getJsonCats = async () => {
	let data = JSON.parse(fs.readFileSync('static/cats.json', 'utf-8'))
	data.forEach(async (cat) => {
		let jpg = await getMedia(cat)

		let blob = await jpg.arrayBuffer();

		storeCatsToMYSQL(blob, cat)
	})
}
getJsonCats()

// setInterval(async () => {
// 	await getCat();
// } , 1000);