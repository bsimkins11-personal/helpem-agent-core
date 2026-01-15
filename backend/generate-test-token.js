// generate-test-token.js
// Generate a valid JWT test token without database access

import jwt from 'jsonwebtoken';

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
    console.error('❌ JWT_SECRET environment variable not set');
    console.error('\nGet JWT_SECRET from Railway:');
    console.error('1. Go to Railway dashboard');
    console.error('2. Click on backend service');
    console.error('3. Go to Variables tab');
    console.error('4. Copy JWT_SECRET value');
    console.error('5. Run: JWT_SECRET="<value>" node generate-test-token.js');
    process.exit(1);
}

// Generate test user IDs
const testUserId = 'test-' + Date.now();
const testAppleUserId = 'apple-test-' + Date.now();

console.log('📝 Generating test session token...\n');

// Generate session token
const sessionToken = jwt.sign(
    {
        userId: testUserId,
        appleUserId: testAppleUserId,
    },
    jwtSecret,
    { expiresIn: '30d' }
);

console.log('✅ Test session token generated!\n');
console.log('════════════════════════════════════════════════════════════');
console.log('Session Token:');
console.log(sessionToken);
console.log('════════════════════════════════════════════════════════════\n');

console.log('User ID:', testUserId);
console.log('Apple User ID:', testAppleUserId);
console.log('\n📋 Next Steps:\n');
console.log('1. Open: ios/HelpEmApp/AuthManager.swift');
console.log('2. Find the skipAuthForTesting() method');
console.log('3. Replace these values:');
console.log(`   mockSessionToken = "${sessionToken}"`);
console.log(`   mockUserId = "${testUserId}"`);
console.log(`   mockAppleUserId = "${testAppleUserId}"`);
console.log('\n4. Build and run the iOS app in Xcode');
console.log('5. Tap "Skip for Testing"');
console.log('6. Tap the blue floating button to open Database Test');
console.log('7. Type a message and tap "Save as Text"');
console.log('\n⚠️  Note: This token will work for API calls, but user');
console.log('   won\'t exist in database until first save creates it.');
