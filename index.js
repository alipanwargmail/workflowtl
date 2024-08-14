require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const session = require('express-session');
const morgan = require('morgan')
var cors = require('cors');
const routes = require('./routes/routes')


const port = 3001

const app = express()

app.use(session({
  secret: 'thatsecretthinggoeshere',
  resave: false,
  saveUninitialized: true
}));

app.use(bodyParser.urlencoded({
  extended: true
}))

app.use(bodyParser.json())

app.use(morgan('combined'))
app.use(cors())
app.use('/', routes)

app.use(express.static('public'))
// Handle errors.

app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.json({ error: err });
});


app.listen(port, '0.0.0.0', (err) => {
    if (err) {
      return console.log('something bad happened', err)
    }
  
    console.log(`server is listening on ${port}`)
})