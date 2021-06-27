const express = require('express');
const app = express();
const reportData = require('./generateReport')

app.get('/api', (req, res) => {
  console.log("Logged");
  res.send(reportData.reportData);
});

app.listen(3000, () => {
  console.log('listening on port 3000!');
});
