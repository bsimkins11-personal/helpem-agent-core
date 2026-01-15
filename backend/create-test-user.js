// create-test-user.js
// Script to create a test user and generate a valid session token for local testing

import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Check for required environment variables
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable not set');
    console.error('\nRun this script on Railway:');
    console.error('  railway run node create-test-user.js');
    console.error('\nOr set DATABASE_URL locally (get from Railway dashboard)');
    process.exit(1);
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function createTestUser() {
    const testAppleUserId = 'test_user_local_' + Date.now();
    
    console.log('Creating test user...');
    
    // Create user in database
    const user = await prisma.user.create({
        data: {
            appleUserId: testAppleUserId,
            lastActiveAt: new Date(),
        },
    });
    
    console.log('✅ Test user created:');
    console.log('   User ID:', user.id);
    console.log('   Apple User ID:', user.appleUserId);
    
    // Generate session token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new Error('JWT_SECRET not set');
    }
    
    const sessionToken = jwt.sign(
        {
            userId: user.id,
            appleUserId: user.appleUserId,
        },
        jwtSecret,
        { expiresIn: '30d' }
    );
    
    console.log('\\n✅ Session token generated:');
    console.log(sessionToken);
    console.log('\\n📋 Copy this token and use it in iOS KeychainHelper for testing');
    console.log('\\nTo use in iOS:');
    console.log('1. Modify skipAuthForTesting() in AuthManager.swift');
    console.log('2. Replace mockSessionToken with this token');
    console.log('3. Use this userId:', user.id);
    
    await prisma.$disconnect();
}

createTestUser().catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
});
