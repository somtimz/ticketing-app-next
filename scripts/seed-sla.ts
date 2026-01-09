import { db } from '../lib/db';
import { slaPolicies } from '../lib/db/schema';

async function seedSLAPolicies() {
  console.log('Seeding SLA policies...');

  const policies = [
    {
      priority: 'P1',
      firstResponseMinutes: 15,   // 15 minutes
      resolutionMinutes: 240,      // 4 hours
      isActive: true,
    },
    {
      priority: 'P2',
      firstResponseMinutes: 30,   // 30 minutes
      resolutionMinutes: 480,     // 8 hours
      isActive: true,
    },
    {
      priority: 'P3',
      firstResponseMinutes: 60,   // 1 hour
      resolutionMinutes: 1440,    // 24 hours
      isActive: true,
    },
    {
      priority: 'P4',
      firstResponseMinutes: 120,  // 2 hours
      resolutionMinutes: 2880,    // 48 hours
      isActive: true,
    },
  ];

  try {
    for (const policy of policies) {
      await db.insert(slaPolicies).values(policy);
      console.log(`  ✓ Created ${policy.priority} policy: ${policy.firstResponseMinutes}min first response, ${policy.resolutionMinutes}min resolution`);
    }

    console.log('\n✓ SLA policies seeded successfully!');
  } catch (error: any) {
    console.error('✗ Error seeding SLA policies:', error.message);
    process.exit(1);
  }
}

seedSLAPolicies();
