const express = require("express");

var app = express();
app.use(express.static('public'))
app.listen(8888);

/* ===== MAIN PAGE ===== */
app.get('/', function(req, response) {
    response.sendFile('index.html', { root: __dirname});
});

/* ===== ASSETS ===== */
app.get('/assets/:name', function(req, response) {
    response.sendFile(`assets/${req.params.name}`, { root: __dirname});
});

/* ===== DATA ===== */
app.get('/data/:name', function(req, response) {
    response.sendFile(`data/${req.params.name}`, { root: __dirname});
});

/* ===== API ===== */
app.get('/api/available_assets', function(req, response) {
    response.sendFile(`data/assets.json`, { root: __dirname});
});
