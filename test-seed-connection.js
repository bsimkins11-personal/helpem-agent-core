#!/usr/bin/env node

/**
 * Test database connection and Prisma setup
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  console.log('🔍 Testing database connection...\n');
  
  try {
    // Test connection
    const userCount = await prisma.user.count();
    console.log(`✅ Database connected!`);
    console.log(`   Found ${userCount} users\n`);
    
    // Show recent users
    const users = await prisma.user.findMany({
      orderBy: { lastActiveAt: 'desc' },
      take: 5,
    });
    
    console.log('📋 Recent users:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    for (const user of users) {
      console.log(`   ID: ${user.id}`);
      console.log(`   Apple ID: ${user.appleUserId}`);
      console.log(`   Last active: ${user.lastActiveAt}`);
      console.log('');
    }
    
    if (users.length === 0) {
      console.log('   ⚠️  No users found. Sign in to the app first!');
    } else {
      console.log('\n💡 To create demo tribes, run:');
      console.log(`   ./seed-demo-tribes.sh ${users[0].id}`);
    }
    
  } catch (error) {
    console.error('❌ Database connection failed!');
    console.error('Error:', error.message);
    console.error('');
    console.error('Troubleshooting:');
    console.error('  1. Check DATABASE_URL is set: echo $DATABASE_URL');
    console.error('  2. Verify you can connect: psql $DATABASE_URL');
    console.error('  3. Run migrations: cd backend && npx prisma migrate deploy');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
