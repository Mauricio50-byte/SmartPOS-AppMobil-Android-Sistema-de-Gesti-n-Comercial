const https = require('https');

const data = JSON.stringify({
  correo: 'test@test.com',
  password: 'password123'
});

const options = {
  hostname: 'smartpos-appmobil-android-sistema-de.onrender.com',
  port: 443,
  path: '/auth/ingresar',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let responseBody = '';

  res.on('data', (chunk) => {
    responseBody += chunk;
  });

  res.on('end', () => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Response: ${responseBody}`);
  });
});

req.on('error', (error) => {
  console.error(`Error: ${error.message}`);
});

req.write(data);
req.end();
