/**
 * Created by d1m on 7/28/2015.
 */

var express = require('express')
var bodyParser = require('body-parser')
var morgan = require('morgan')

console.log('---------------')
console.log('GestRec Trainer')
console.log('')
console.log('You can browse : http://127.0.0.1:8080/')

var app = express()
app.use(morgan())

var urlencodedParser = bodyParser.urlencoded({ extended: false, limit: '50mb' })
app.get('/gestrec.min.js', urlencodedParser, function (req, res) {
  require('fs').createReadStream('gestrec.min.js').pipe(res)
})

app.post('/data', urlencodedParser, function (req, res) {
  require('fs').writeFileSync('results.json', JSON.stringify(JSON.parse(req.body.train), null, 2))
  res.send(200)
})

app.use(express.static('trainer'));

app.listen(8080);
