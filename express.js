var express = require('express')
var bodyParser = require('body-parser')
var morgan = require('morgan')
var app = express()

app.use(morgan())

var urlencodedParser = bodyParser.urlencoded({ extended: false })
app.get('/gestrec.min.js', urlencodedParser, function (req, res) {
  require('fs').createReadStream('gestrec.min.js').pipe(res)
})

app.post('/data', urlencodedParser, function (req, res) {
  require('fs').writeFileSync('results.json', JSON.stringify(JSON.parse(req.body.train), null, 2))
  res.send(200)
})

app.use(express.static('trainer'));

app.listen(8080);
