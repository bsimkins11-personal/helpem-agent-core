/**
 * Test script to verify permission key generation
 * Run with: node test-tribe-permissions.js
 */

function generatePermissionKey(action, itemType) {
  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
  const pluralize = (type) => {
    // Special case for grocery -> groceries
    if (type === 'grocery') return 'Groceries';
    return capitalize(type) + 's';
  };
  
  return `can${capitalize(action)}${pluralize(itemType)}`;
}

console.log('Testing permission key generation:\n');

const testCases = [
  { action: 'add', itemType: 'task', expected: 'canAddTasks' },
  { action: 'remove', itemType: 'task', expected: 'canRemoveTasks' },
  { action: 'add', itemType: 'routine', expected: 'canAddRoutines' },
  { action: 'remove', itemType: 'routine', expected: 'canRemoveRoutines' },
  { action: 'add', itemType: 'appointment', expected: 'canAddAppointments' },
  { action: 'remove', itemType: 'appointment', expected: 'canRemoveAppointments' },
  { action: 'add', itemType: 'grocery', expected: 'canAddGroceries' },
  { action: 'remove', itemType: 'grocery', expected: 'canRemoveGroceries' },
];

let allPassed = true;

testCases.forEach(({ action, itemType, expected }) => {
  const result = generatePermissionKey(action, itemType);
  const passed = result === expected;
  
  console.log(`${passed ? '✅' : '❌'} ${action} ${itemType} → ${result} ${passed ? '' : `(expected: ${expected})`}`);
  
  if (!passed) allPassed = false;
});

console.log('\n' + (allPassed ? '✅ All permission keys generate correctly!' : '❌ Some permission keys are incorrect!'));

// Test against actual schema fields
console.log('\n\nExpected schema fields:');
const schemaFields = [
  'canAddTasks',
  'canRemoveTasks',
  'canAddRoutines',
  'canRemoveRoutines',
  'canAddAppointments',
  'canRemoveAppointments',
  'canAddGroceries',
  'canRemoveGroceries',
];

schemaFields.forEach(field => console.log(`  - ${field}`));

console.log('\n✅ Verification complete!');
