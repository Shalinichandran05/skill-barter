const https = require('https');

function testEndpoint(path, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const postData = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'skill-barter-three.vercel.app',
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {})
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ path, status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ path, status: res.statusCode, body: data.slice(0, 200) }); }
      });
    });
    req.on('error', e => resolve({ path, status: 'ERROR', body: e.message }));
    req.setTimeout(15000, () => { resolve({ path, status: 'TIMEOUT', body: 'No response in 15s' }); req.destroy(); });
    if (postData) req.write(postData);
    req.end();
  });
}

(async () => {
  console.log('Testing live Vercel deployment...\n');
  
  const r1 = await testEndpoint('/api/health');
  console.log('GET /api/health:', r1.status, JSON.stringify(r1.body));

  const r2 = await testEndpoint('/api/public/stats');
  console.log('GET /api/public/stats:', r2.status, JSON.stringify(r2.body));

  const r3 = await testEndpoint('/api/auth/register', 'POST', {
    name: 'Test', email: `t${Date.now()}@example.com`,
    password: 'pass1234', mobile: '9876543210', location: 'Chennai'
  });
  console.log('POST /api/auth/register:', r3.status, JSON.stringify(r3.body));
})();
