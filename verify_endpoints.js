const http = require('http');

const PORT = 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;

// Helper to make HTTP requests using Node.js standard library
function makeRequest(url, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function verify() {
  console.log('🏁 Starting VibeCheck API verification tests...');
  let token = null;
  const testEmail = `traveler-${Math.floor(Math.random() * 10000)}@test.com`;

  try {
    // 1. Test Register
    console.log('\n1. Testing Register endpoint...');
    const registerRes = await makeRequest(`${BASE_URL}/api/auth/register`, 'POST', {
      name: 'Test Traveler',
      email: testEmail,
      password: 'password123'
    });
    
    if (registerRes.status === 201 && registerRes.data.token) {
      console.log('✅ Registration successful!');
      console.log(`   User: ${registerRes.data.user.name}, Initial Points: ${registerRes.data.user.points}`);
      token = registerRes.data.token;
    } else {
      console.error('❌ Registration failed:', registerRes);
      process.exit(1);
    }

    // 2. Test Login
    console.log('\n2. Testing Login endpoint...');
    const loginRes = await makeRequest(`${BASE_URL}/api/auth/login`, 'POST', {
      email: testEmail,
      password: 'password123'
    });

    if (loginRes.status === 200 && loginRes.data.token) {
      console.log('✅ Login successful!');
    } else {
      console.error('❌ Login failed:', loginRes);
      process.exit(1);
    }

    // 3. Test Places Search
    console.log('\n3. Testing Places fetching (Goa)...');
    const placesRes = await makeRequest(`${BASE_URL}/api/places?destination=goa`);
    if (placesRes.status === 200 && Array.isArray(placesRes.data)) {
      console.log(`✅ Fetched Goa gems successfully! Found ${placesRes.data.length} spots.`);
    } else {
      console.error('❌ Places fetch failed:', placesRes);
      process.exit(1);
    }

    // 4. Test AI Recommendation Engine
    console.log('\n4. Testing AI Recommendations...');
    const recsRes = await makeRequest(`${BASE_URL}/api/recommendations?destination=goa`, 'GET', null, token);
    if (recsRes.status === 200 && Array.isArray(recsRes.data)) {
      console.log('✅ Recommendations calculated successfully!');
      console.log(`   Top Match: "${recsRes.data[0].gem.name}" with score ${recsRes.data[0].score}`);
    } else {
      console.error('❌ Recommendations failed:', recsRes);
      process.exit(1);
    }

    // 5. Test Review Posting & Reward points logic
    console.log('\n5. Testing Review submission on a hidden gem ("Cola Beach")...');
    const reviewRes = await makeRequest(`${BASE_URL}/api/places/gem/Cola%20Beach/reviews`, 'POST', {
      rating: 5,
      comment: 'Absolutely stunning! Loved the quiet lagoon and clean water. Very few crowds.'
    }, token);

    if (reviewRes.status === 201) {
      console.log('✅ Review submitted successfully!');
      console.log(`   Points reward notification: ${reviewRes.data.message}`);
      console.log(`   Updated Points balance: ${reviewRes.data.updatedPoints} (${reviewRes.data.updatedBadge})`);
    } else {
      console.error('❌ Review submission failed:', reviewRes);
      process.exit(1);
    }

    // 6. Test Reward Voucher Redemption
    console.log('\n6. Testing Reward Voucher redemption (cost 60 points)...');
    // User started with 50 points, earned 25 for review = 75 points. Should be able to redeem 'v1' (cost 60)
    const redeemRes = await makeRequest(`${BASE_URL}/api/auth/redeem`, 'POST', {
      voucherId: 'v1'
    }, token);

    if (redeemRes.status === 200) {
      console.log('✅ Voucher redemption successful!');
      console.log(`   Claimed: ${redeemRes.data.user.vouchers[0].name}`);
      console.log(`   Voucher Code: ${redeemRes.data.voucherCode}`);
      console.log(`   Remaining Points: ${redeemRes.data.pointsRemaining}`);
    } else {
      console.error('❌ Voucher redemption failed:', redeemRes);
      process.exit(1);
    }

    // 7. Test Analytics Dashboard
    console.log('\n7. Testing Analytics Dashboard API...');
    const analyticsRes = await makeRequest(`${BASE_URL}/api/analytics`);
    if (analyticsRes.status === 200) {
      console.log('✅ Analytics fetched successfully!');
      console.log(`   Total Reviews: ${analyticsRes.data.totalReviews}, Avg Rating: ${analyticsRes.data.avgRating}`);
      console.log('🏆 Current Leaderboard Top traveler:', analyticsRes.data.leaderboard[0].name);
    } else {
      console.error('❌ Analytics fetching failed:', analyticsRes);
      process.exit(1);
    }

    console.log('\n🎉 API verification tests completed. All endpoints are fully operational!');
    process.exit(0);

  } catch (err) {
    console.error('❌ Critical testing failure:', err);
    process.exit(1);
  }
}

verify();
