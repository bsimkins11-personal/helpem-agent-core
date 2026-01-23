#!/usr/bin/env node

/**
 * Railway deployment script to seed demo tribes
 * Runs on Railway with internal DATABASE_URL
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter, log: ['error'] });

console.log('🔍 Finding most recent user...');

async function main() {
  try {
    // Find the most recent user
    const user = await prisma.user.findFirst({
      orderBy: { lastActiveAt: 'desc' }
    });
    
    if (!user) {
      console.error('❌ No users found. Sign in to the app first.');
      process.exit(1);
    }
    
    console.log(`✅ Found user: ${user.appleUserId} (ID: ${user.id})`);
    console.log('');
    
    // Import and run the main seed function
    const { default: seedModule } = await import('./seed-demo-tribes.js');
    
    // Run seed with the found user ID
    process.argv[2] = user.id;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
