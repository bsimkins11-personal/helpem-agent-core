import { prisma } from './src/lib/prisma.js';

async function clearInvites() {
  try {
    // Find and delete all pending invitations
    const deleted = await prisma.pendingTribeInvitation.deleteMany({
      where: { state: 'pending' }
    });
    console.log(`Deleted ${deleted.count} pending invitations`);
    
    // Also show what's left
    const remaining = await prisma.pendingTribeInvitation.findMany();
    console.log(`Remaining invitations: ${remaining.length}`);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

clearInvites();
