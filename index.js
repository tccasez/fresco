var express = require('express');
var app = express();
var path = require('path');

app.use(express.static('public'));

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, '/public/index.html'));
});

app.post('/getFeed', function(req, res) {
  console.log('getting feed!!');
})

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});
