const https = require('https');

const url = 'https://smartpos-appmobil-android-sistema-de.onrender.com/salud';

https.get(url, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Response: ${data}`);
  });

}).on("error", (err) => {
  console.log("Error: " + err.message);
});
