import express from 'express';
import http from 'node:http';
import createBareServer from "educational-br-sr";
import path from 'node:path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import ejs from 'ejs';
import axios from 'axios';
import miniget from 'miniget';
import ytpl from 'ytpl';
import ytsr from 'ytsr';
import bodyParser from 'body-parser';
import scdl from 'soundcloud-downloader';

const __dirname = process.cwd();
const server = http.createServer();
const app = express(server);
const bareServer = createBareServer('/outerspace/');
const PORT = 8080;

const limit = process.env.LIMIT || 50;
const user_agent = process.env.USER_AGENT || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36";

app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.set('view engine', 'ejs');
app.use(cookieParser());
app.use(bodyParser.json());

app.use(session({
    secret: 'wakamedayoooooooooooharusameeeeeee',
    resave: false,
    saveUninitialized: true
}));

//ログイン
// 読み込み時ちぇっく
app.use((req, res, next) => {
    if (req.cookies.massiropass !== 'ok' && !req.path.includes('login')) {
        return res.redirect('/login');
    } else {
        next();
    }
});

app.use(express.static(path.join(__dirname, 'static')));

//ログイン済み？
app.get('/login/if', async (req, res) => {
    if (req.cookies.massiropass !== 'ok') {
        res.render('login', { error: 'ログインしていません。もう一度ログインして下さい' })
    } else {
        return res.redirect('/');
    }
});
// ログインページ
app.get('/login', (req, res) => {
    let referer = req.get('Referer') || 'No referer information';
    let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log(`URL: ${referer} から来た, IP: ${ip}`);
    res.render('../login/login.ejs', { error: null });
});
// パスワード確認
app.post('/login', (req, res) => {
    const password = req.body.password;
    if (password === 'massiro') {
        res.cookie('massiropass', 'ok', { maxAge: 5 * 24 * 60 * 60 * 1000, httpOnly: true });
        
        return res.redirect("/");
    } else {
        if (password === 'ohana') {
            return res.redirect('https://ohuaxiehui.webnode.jp');
        } else {
            res.render('../login/login.ejs', { error: 'パスワードが間違っています。もう一度お試しください。' });
        }
    }
});
//パスワードを忘れた場合
app.get('/login/forgot', (req, res) => {
  res.render(`../login/forgot.ejs`);
});
//ログアウト
app.post('/logout', (req, res) => {
    res.cookie('pass', 'false', { maxAge: 1, httpOnly: true });
    return res.redirect('/login');
});
//cookie
function parseCookies(request) {
    const list = {};
    const cookieHeader = request.headers.cookie;

    if (cookieHeader) {
        cookieHeader.split(';').forEach(cookie => {
            let parts = cookie.split('=');
            list[parts.shift().trim()] = decodeURI(parts.join('='));
        });
    }

    return list;
}

const routes = [
  { path: '/', file: 'index.html' },
  { path: '/news', file: 'apps.html' },
  { path: '/events', file: 'games.html' },
  { path: '/send', file: 'send.html' },
  { path: '/local-news', file: 'tabs.html' },
  { path: '/image-galleries', file: 'go.html' },
];

app.get('/edu/*', cors({ origin: false }), async (req, res, next) => {
  try {
    const reqTarget = `https://raw.githubusercontent.com/InterstellarNetwork/Interstellar-Assets/main/${req.params[0]}`;
    const asset = await fetch(reqTarget);
    
    if (asset.ok) {
      const data = await asset.arrayBuffer();
      res.end(Buffer.from(data));
    } else {
      next();
    }
  } catch (error) {
    console.error('Error fetching:', error);
    next(error);
  }
});

//わかめtube
app.get("/wkt/home", async (req, res) => {
  try {
    const response = await axios.get(`https://wataamee.glitch.me/topvideos/apiv2`);
    const topVideos = response.data;
    res.render("wakametube.ejs", { topVideos });
  } catch (error) {
    console.error('エラーが発生しました:', error);
    res.status(500).send('データを取得できませんでした');
  }
});

//設定
app.get('/wkt/setting', (req, res) => {
    const cookies = parseCookies(req);
    const wakametubeumekomi = cookies.wakametubeumekomi === 'true';
    res.render('setting.ejs', { wakametubeumekomi });
});

app.post('/wkt/setting', (req, res) => {
    const wakametubeumekomi = req.body.wakametubeumekomi === 'on';

    res.setHeader('Set-Cookie', [
        `wakametubeumekomi=${wakametubeumekomi}; HttpOnly; Max-Age=31536000`
    ]);
    
    res.redirect('/wkt/setting');
});

app.get('/wkt/w/:id', async (req, res) => {
    const videoId = req.params.id;
    const server = req.query.server || '0';
    const serverUrls = {
        '0': 'https://wataamee.glitch.me',
        '1': 'https://battle-deciduous-bear.glitch.me',
        '2': 'https://watawatawata.glitch.me',
        '3': 'https://amenable-charm-lute.glitch.me',
    };

    const baseUrl = serverUrls[server] || 'https://wataamee.glitch.me';

    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return res.status(400).send('不正なvideoID');
    }

    const cookies = parseCookies(req);
    const wakames = cookies.wakametubeumekomi === 'true';
    if (wakames) {
        return res.redirect(`/wkt/umekomi/${videoId}`);
    }

    try {
        const response = await axios.get(`${baseUrl}/api/${videoId}`, {
            params: { token: process.env.WAKAME_API_TOKEN },
        });

        const videoData = response.data;
        console.log(videoData);

        res.render('infowatch', { videoData, videoId });
    } catch (error) {
        console.error(`Failed to fetch video data: ${error.message}`, error.response?.data);

        res.status(500).render('matte', {
            videoId,
            error: '動画を取得できません',
            details: error.message,
        });
    }
});

//高画質再生！！
app.get('/wkt/www/:id', async (req, res) => {
  const videoId = req.params.id;
    try {
        const response = await axios.get(`https://wataamee.glitch.me/api/${videoId}?token=wakameoishi`);
        const videoData = response.data;

        res.render('highquo', { videoData, videoId });
  } catch (error) {
        res.status(500).render('matte', { 
      videoId, 
      error: '動画を取得できません', 
      details: error.message 
    });
  }
});

//音だけ再生
app.get('/wkt/ll/:id', async (req, res) => {
  const videoId = req.params.id;

    try {
        const response = await axios.get(`https://wataamee.glitch.me/api/${videoId}?token=wakameoishi`);
        const videoData = response.data;

        res.render('listen', { videoData, videoId });
   } catch (error) {
        res.status(500).render('matte', { 
      videoId, 
      error: '動画を取得できません', 
      details: error.message 
    });
  }
});

//埋め込み再生
app.get('/wkt/umekomi/:id', async (req, res) => {
  let videoId = req.params.id;
  let url = `https://www.youtube.com/watch?v=${videoId}`;
  
  try {
    const inforesponse = await axios.get(url);
    const html = inforesponse.data;

    const titleMatch = html.match(/"title":\{.*?"text":"(.*?)"/);
    const descriptionMatch = html.match(/"attributedDescriptionBodyText":\{.*?"content":"(.*?)","commandRuns/);
    const viewsMatch = html.match(/"views":\{.*?"simpleText":"(.*?)"/);
    const channelImageMatch = html.match(/"channelThumbnail":\{.*?"url":"(.*?)"/);
    const channelNameMatch = html.match(/"channel":\{.*?"simpleText":"(.*?)"/);
    const channnelIdMatch = html.match(/"browseEndpoint":\{.*?"browseId":"(.*?)"/);

    const videoTitle = titleMatch ? titleMatch[1] : 'タイトルを取得できませんでした';
    const videoDes = descriptionMatch ? descriptionMatch[1].replace(/\\n/g, '\n') : '概要を取得できませんでした';
    const videoViews = viewsMatch ? viewsMatch[1] : '再生回数を取得できませんでした';
    const channelImage = channelImageMatch ? channelImageMatch[1] : '取得できませんでした';
    const channelName = channelNameMatch ? channelNameMatch[1] : '取得できませんでした';
    const channelId = channnelIdMatch ? channnelIdMatch[1] : '取得できませんでした';
    
    res.render('umekomi.ejs', { videoId, videoTitle, videoDes, videoViews, channelImage, channelName, channelId});
  } catch (error) {
    console.error(error);
    res.status(500).render('matte', { videoId, error: '動画情報を取得できません', details: error.message });
  }
});

// チャンネル
app.get("/wkt/c/:id", async (req, res) => {
	if (!req.params.id) return res.redirect("/");
	let page = Number(req.query.p || 1);
	try {
		res.render("channel.ejs", {
			channel: await ytpl(req.params.id, { limit, pages: page }),
			page
		});
	} catch (error) {
		console.error(error);
		res.status(500).render("error.ejs",{
			title: "ytpl Error",
			content: error
		});
	}
});

app.get("/s", async (req, res) => {
	let query = req.query.q;
	let page = Number(req.query.p || 2);
    try {
		res.render("search.ejs", {
			res: await ytsr(query, { limit, pages: page }),
			query: query,
			page
		});
	} catch (error) {
		console.error(error);
		try {
			res.status(500).render("error.ejs", {
				title: "ytsr Error",
				content: error
			});
		} catch (error) {
			console.error(error);
		}
	}
});

//サムネ画像
app.get("/vi*", (req, res) => {
	let stream = miniget(`https://i.ytimg.com/${req.url.split("?")[0]}`, {
		headers: {
			"user-agent": user_agent
		}
	});
	stream.on('error', err => {
		console.log(err);
		res.status(500).send(err.toString());
	});
	stream.pipe(res);
});

app.get('/wkt/comment/:id', async (req, res) => {
  const videoId = req.params.id;
    try {
        const response = await axios.get(`https://wakamecomment.glitch.me/api/wakame/${videoId}`);
        const cm = response.data;

        res.render('comment', { cm });
   } catch (error) {
        res.status(500).render('error', { 
      videoId, 
      error: 'コメントを取得できません', 
      details: error.message 
    });
  }
});

//サジェスト
app.get('/suggest', (req, res) => {
    const keyword = req.query.keyword;
    const options = {
        hostname: 'www.google.com',
        path: `/complete/search?client=youtube&hl=ja&ds=yt&q=${encodeURIComponent(keyword)}`,
        method: 'GET',
        headers: {
            'User-Agent': 'Mozilla/5.0'
        }
    };
    const request = http.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => {
            data += chunk;
        });
        response.on('end', () => {
            const jsonString = data.substring(data.indexOf('['), data.lastIndexOf(']') + 1);

            try {
                const suggestionsArray = JSON.parse(jsonString);
                const suggestions = suggestionsArray[1].map(i => i[0]);
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.json(suggestions);
            } catch (error) {
                console.error('JSON parse error:', error);
                res.status(500).send({ error: 'えらー。あらら' });
            }
        });
    });
    request.on('error', (error) => {
        console.error('Request error:', error);
        res.status(500).send({ error: 'えらー。あらら' });
    });
    request.end();
});

app.get('/wakams', (req, res) => {
    res.render('wakamusic', { tracks: [] , query: [] });
});

app.get('/wakamc', async (req, res) => {
    const query = req.query.q;

    if (!query) {
        return res.status(400).send('Search query is required');
    }

    try {
        const response = await axios.get(`https://wataamee.glitch.me/wakamc/api?q=${query}`);
        const searchResults = response.data;
      
        const tracks = searchResults.collection.slice(0, 10).map(track => ({
            id: track.id,
            title: track.title,
            username: track.user.username,
            artwork_url: track.artwork_url ? track.artwork_url.replace('-large', '-t500x500') : 'https://via.placeholder.com/500'
        }));

        res.render('wakamusic', { tracks: tracks , query: query });
    } catch (error) {
        console.error('Error occurred while searching:', error);
        res.status(500).send('えらー。あらら');
    }
});

//game
app.get('/game/:id', (req, res) => {
  const id = req.params.id;
  res.render(`../game/${id}.ejs`);
});

routes.forEach((route) => {
  app.get(route.path, (req, res) => {
    res.sendFile(path.join(__dirname, 'static', route.file));
  });
});

//リダイレクト
app.get('/redirect', (req, res) => {
  const subp = req.query.p;
  const id= req.query.id;
  if (id) {
    res.redirect(`/${subp}/${id}`);
  } else {
    res.redirect(`/${subp}`);
  }
});

server.on('request', (req, res) => {
  if (bareServer.shouldRoute(req)) {
    bareServer.routeRequest(req, res);
  } else {
    app(req, res);
  }
});

server.on('upgrade', (req, socket, head) => {
  if (bareServer.shouldRoute(req)) {
    bareServer.routeUpgrade(req, socket, head);
  } else {
    socket.end();
  }
});

server.on('listening', () => {
  console.log(`Running at http://localhost:${PORT}`);
});

server.listen({
  port: PORT,
});
