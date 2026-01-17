// Clear all data from the database (for testing/UAT reset)
import { prisma } from '../src/lib/prisma.js';

async function clearAllData() {
  try {
    console.log('🗑️  Clearing ALL test data from database...\n');
    
    // Delete user data (todos, appointments, habits)
    const deletedTodos = await prisma.todo.deleteMany({});
    console.log(`✅ Deleted ${deletedTodos.count} todos`);
    
    const deletedAppointments = await prisma.appointment.deleteMany({});
    console.log(`✅ Deleted ${deletedAppointments.count} appointments`);
    
    const deletedHabits = await prisma.habit.deleteMany({});
    console.log(`✅ Deleted ${deletedHabits.count} habits`);
    
    const deletedInputs = await prisma.userInput.deleteMany({});
    console.log(`✅ Deleted ${deletedInputs.count} user inputs`);
    
    const deletedInstructions = await prisma.userInstruction.deleteMany({});
    console.log(`✅ Deleted ${deletedInstructions.count} user instructions`);
    
    console.log('\n✨ Database cleared successfully! All users will start with empty state.');
    console.log('   Users and their auth data preserved.');
    
  } catch (error) {
    console.error('\n❌ Error clearing database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearAllData();
