const express = require('express');
const app = express();

app.get('/api', (req, res) => {
  console.log("Logged");
  res.send('Hello World!');
});

app.listen(3000, () => {
  console.log('listening on port 3000!');
});
