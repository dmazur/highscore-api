const http = require('http');
const querystring = require('querystring');

require('dotenv').config()
const lowdb = require('lowdb');
const FileAsync = require('lowdb/adapters/FileAsync');

const hostname = process.env.HOST;
const port = process.env.PORT;

const adapter = new FileAsync('db.json');

(async () => {
  const db = await lowdb(adapter);
  const server = http.createServer((req, res) => {
    setResponseHeaders(res, parseInt(process.env.CORS));

    if (req.method === 'GET') {
      let scoresCollection = db.get('scores');

      if (parseInt(process.env.ONLY_APPROVED)) {
        scoresCollection = scoresCollection.filter({approved: true});
      }

      const topScores = scoresCollection
        .orderBy(['score'], ['desc'])
        .take(10)
        .value();

      const topScoresTokenized = [];
      for (const score of topScores) {
        topScoresTokenized.push(score.name);
        topScoresTokenized.push(score.score);
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain');
      res.end(topScoresTokenized.join('|'));
    } else if (req.method === 'POST') {
      let body = '';

      req.on('data', data => {
        body += data;
      });

      req.on('end', () => {
        const postData = querystring.parse(body);
        const name = postData.name;
        const score = parseInt(postData.score);

        if (!name || !score) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'text/plain');
          res.end('Missing data');
        }

        if (process.env.SECURITY_TOKEN && process.env.SECURITY_TOKEN !== postData.token) {
          res.statusCode = 403;
          res.setHeader('Content-Type', 'text/plain');
          res.end('Access denied');
        }

        db.get('scores')
          .push({
            name,
            score,
            date: Date.now(),
            approved: false,
          })
          .write()

        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.end('OK');
      });
    } else {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Method not allowed');
    }
  });

  db.defaults({ scores: [] }).write();
  
  server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
  });
})();

function setResponseHeaders(response, cors = true) {
  if (!cors) {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  }
} 
