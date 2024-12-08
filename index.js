import express from 'express';
import http from 'node:http';
import createBareServer from "educational-br-sr";
import path from 'node:path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import ejs from 'ejs';
import axios from 'axios';

const __dirname = process.cwd();
const server = http.createServer();
const app = express(server);
const bareServer = createBareServer('/outerspace/');
const PORT = 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.set('view engine', 'ejs');

app.use(cookieParser());
app.use(session({
    secret: 'wakamedayoooooooooooharusameeeeeee',
    resave: false,
    saveUninitialized: true
}));

//ログイン
// 読み込み時ちぇっく
app.use((req, res, next) => {
    console.log("welcome!");
    if (req.cookies.massiropass !== 'ok' && !req.path.includes('login')) {
        req.session.redirectTo = req.path !== '/' ? req.path : null;
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
    if (password === 'harusame') {
        res.cookie('massiropass', 'ok', { maxAge: 5 * 24 * 60 * 60 * 1000, httpOnly: true });
        
        const redirectTo = req.session.redirectTo || '/';
        delete req.session.redirectTo;
        return res.redirect(redirectTo);
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

const routes = [
  { path: '/', file: 'index.html' },
  { path: '/news', file: 'apps.html' },
  { path: '/events', file: 'games.html' },
  { path: '/diagnostic', file: 'settings.html' },
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
    const data= await axios.get(`https://wataame.glitch.me/api/topvideos`);

    const videoCount = data.reduce((acc, { videoId, videoTitle, channelName, channelId }) => {
      if (!acc[videoId]) {
        acc[videoId] = { count: 0, videoTitle };
      }
      acc[videoId].count += 1;
      return acc;
    }, {});

    const topVideos = Object.entries(videoCount)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 25);

    res.render("wakametube.html", { topVideos });
  } catch (error) {
    console.error('エラーが発生しました:', error);
    res.status(500).send('データを取得できませんでした');
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

routes.forEach((route) => {
  app.get(route.path, (req, res) => {
    res.sendFile(path.join(__dirname, 'static', route.file));
  });
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
