/**
 * Get Test User Tokens
 * Queries the database for users and generates session tokens for testing
 *
 * Run: node tests/get-test-tokens.js
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL not set in environment');
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });
const JWT_SECRET = process.env.JWT_SECRET;

async function main() {
  console.log('\n========================================');
  console.log('   GET TEST USER TOKENS');
  console.log('========================================\n');

  if (!JWT_SECRET) {
    console.error('❌ JWT_SECRET not set in environment');
    process.exit(1);
  }

  // Get all users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      appleUserId: true,
      displayName: true,
      email: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Found ${users.length} users:\n`);

  users.forEach((user, index) => {
    // Generate a fresh token for each user
    const token = jwt.sign(
      { userId: user.id, appleUserId: user.appleUserId },
      JWT_SECRET,
      { expiresIn: '1d', algorithm: 'HS256' }
    );

    console.log(`--- User ${index + 1} ---`);
    console.log(`Name:     ${user.displayName || 'Not set'}`);
    console.log(`Email:    ${user.email || 'Not set'}`);
    console.log(`ID:       ${user.id}`);
    console.log(`Created:  ${user.createdAt.toISOString()}`);
    console.log(`Token:    ${token.substring(0, 50)}...`);
    console.log('');
  });

  // Get tribes for context
  const tribes = await prisma.tribe.findMany({
    select: {
      id: true,
      name: true,
      ownerId: true,
      _count: { select: { members: true } }
    }
  });

  console.log(`\nFound ${tribes.length} tribes:\n`);
  tribes.forEach(tribe => {
    const owner = users.find(u => u.id === tribe.ownerId);
    console.log(`- ${tribe.name} (${tribe._count.members} members) - Owner: ${owner?.displayName || 'Unknown'}`);
  });

  // Output tokens for testing
  if (users.length >= 2) {
    console.log('\n========================================');
    console.log('   TOKENS FOR TESTING');
    console.log('========================================\n');

    const adminToken = jwt.sign(
      { userId: users[0].id, appleUserId: users[0].appleUserId },
      JWT_SECRET,
      { expiresIn: '1d', algorithm: 'HS256' }
    );

    const memberToken = jwt.sign(
      { userId: users[1].id, appleUserId: users[1].appleUserId },
      JWT_SECRET,
      { expiresIn: '1d', algorithm: 'HS256' }
    );

    console.log('Run authenticated tests with:');
    console.log('');
    console.log(`TEST_ADMIN_TOKEN="${adminToken}" \\`);
    console.log(`TEST_MEMBER_TOKEN="${memberToken}" \\`);
    console.log('node tests/tribe-authenticated-tests.js');
    console.log('');
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
