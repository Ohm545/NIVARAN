/**
 * NIVARAN — Development Seed
 * Run: node prisma/seed.js   (or via `npm run db:seed`)
 *
 * Seeds:
 *  - All permissions
 *  - All 9 functional roles with correct permissions
 *  - 1 development organization + unit
 *  - 1 SYSTEM_ADMIN user + 1 user per other role (dev only)
 *
 * NEVER use real personal data here.
 * NEVER use these credentials in production.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────
// PERMISSIONS
// ─────────────────────────────────────────────────────────────

const PERMISSIONS = [
  // USER module
  { name: 'USER_VIEW',              displayName: 'View Users',               module: 'USER' },
  { name: 'USER_CREATE',            displayName: 'Create User',               module: 'USER' },
  { name: 'USER_UPDATE',            displayName: 'Update User',               module: 'USER' },
  { name: 'USER_DEACTIVATE',        displayName: 'Deactivate User',           module: 'USER' },
  // ORGANIZATION module
  { name: 'ORGANIZATION_VIEW',      displayName: 'View Organizations',        module: 'ORGANIZATION' },
  { name: 'ORGANIZATION_CREATE',    displayName: 'Create Organization',       module: 'ORGANIZATION' },
  { name: 'ORGANIZATION_UPDATE',    displayName: 'Update Organization',       module: 'ORGANIZATION' },
  // ROLE module
  { name: 'ROLE_VIEW',              displayName: 'View Roles',                module: 'ROLE' },
  { name: 'ROLE_ASSIGN',            displayName: 'Assign Role',               module: 'ROLE' },
  // PROBLEM module (Module 2 — now active)
  { name: 'PROBLEM_CREATE',         displayName: 'Create Problem',            module: 'PROBLEM' },
  { name: 'PROBLEM_VIEW',           displayName: 'View Problem',              module: 'PROBLEM' },
  { name: 'PROBLEM_EDIT',           displayName: 'Edit Problem',              module: 'PROBLEM' },
  { name: 'PROBLEM_SUBMIT',         displayName: 'Submit Problem',            module: 'PROBLEM' },
  // APPROVAL module (active — Approving Authority needs these for future workflow)
  { name: 'APPROVAL_VIEW',          displayName: 'View Approvals',            module: 'APPROVAL' },
  { name: 'APPROVAL_APPROVE',       displayName: 'Approve',                   module: 'APPROVAL' },
  { name: 'APPROVAL_REJECT',        displayName: 'Reject',                    module: 'APPROVAL' },
  { name: 'APPROVAL_SEND_BACK',     displayName: 'Send Back for Correction',  module: 'APPROVAL' },
  // SOLUTION module (Module 5 — now active)
  { name: 'SOLUTION_VIEW',          displayName: 'View Solution',             module: 'SOLUTION' },
  { name: 'SOLUTION_SUBMIT',        displayName: 'Submit Solution',           module: 'SOLUTION' },
  // DISCOVERY module (Module 5 — new)
  { name: 'SOLUTION_DISCOVERY_VIEW',   displayName: 'View Discovery',         module: 'SOLUTION' },
  { name: 'SOLUTION_DISCOVERY_CREATE', displayName: 'Run Discovery',          module: 'SOLUTION' },
  { name: 'SOLUTION_DISCOVERY_REVIEW', displayName: 'Review Candidates',      module: 'SOLUTION' },
  // EVIDENCE module (future)
  { name: 'EVIDENCE_VIEW',          displayName: 'View Evidence',             module: 'EVIDENCE',     isActive: false },
  { name: 'EVIDENCE_SUBMIT',        displayName: 'Submit Evidence',           module: 'EVIDENCE',     isActive: false },
  { name: 'EVIDENCE_VERIFY',        displayName: 'Verify Evidence',           module: 'EVIDENCE',     isActive: false },
  // EVALUATION module (future)
  { name: 'EVALUATION_VIEW',        displayName: 'View Evaluation',           module: 'EVALUATION',   isActive: false },
  { name: 'EVALUATION_CREATE',      displayName: 'Create Evaluation',         module: 'EVALUATION',   isActive: false },
  { name: 'EVALUATION_SUBMIT',      displayName: 'Submit Evaluation',         module: 'EVALUATION',   isActive: false },
  // PILOT module (future)
  { name: 'PILOT_VIEW',             displayName: 'View Pilot',                module: 'PILOT',        isActive: false },
  { name: 'PILOT_CREATE',           displayName: 'Create Pilot',              module: 'PILOT',        isActive: false },
  { name: 'PILOT_MANAGE',           displayName: 'Manage Pilot',              module: 'PILOT',        isActive: false },
  // VALIDATION module (future)
  { name: 'VALIDATION_VIEW',        displayName: 'View Validation',           module: 'VALIDATION',   isActive: false },
  { name: 'VALIDATION_CREATE',      displayName: 'Create Validation',         module: 'VALIDATION',   isActive: false },
  { name: 'VALIDATION_SUBMIT',      displayName: 'Submit Validation',         module: 'VALIDATION',   isActive: false },
  // PROCUREMENT module (future)
  { name: 'PROCUREMENT_VIEW',       displayName: 'View Procurement',          module: 'PROCUREMENT',  isActive: false },
  { name: 'PROCUREMENT_MANAGE',     displayName: 'Manage Procurement',        module: 'PROCUREMENT',  isActive: false },
  // PAYMENT module (future)
  { name: 'PAYMENT_VIEW',           displayName: 'View Payment',              module: 'PAYMENT',      isActive: false },
  { name: 'PAYMENT_PROCESS',        displayName: 'Process Payment',           module: 'PAYMENT',      isActive: false },
  // KNOWLEDGE module (future)
  { name: 'KNOWLEDGE_VIEW',         displayName: 'View Knowledge',            module: 'KNOWLEDGE',    isActive: false },
];

// ─────────────────────────────────────────────────────────────
// ROLES  (name → array of permission names)
// ─────────────────────────────────────────────────────────────

const ROLES = [
  {
    name: 'SYSTEM_ADMIN',
    displayName: 'System Administrator',
    description: 'Manages NIVARAN system identity, access, organizations, and users.',
    isSystem: true,
    permissions: [
      'USER_VIEW', 'USER_CREATE', 'USER_UPDATE', 'USER_DEACTIVATE',
      'ORGANIZATION_VIEW', 'ORGANIZATION_CREATE', 'ORGANIZATION_UPDATE',
      'ROLE_VIEW', 'ROLE_ASSIGN',
    ],
  },
  {
    name: 'PROBLEM_OWNER',
    displayName: 'Problem Owner',
    description: 'Government officer responsible for identifying and managing a government need.',
    permissions: [
      'USER_VIEW',
      'ORGANIZATION_VIEW',
      'PROBLEM_CREATE', 'PROBLEM_VIEW', 'PROBLEM_EDIT', 'PROBLEM_SUBMIT',
      'SOLUTION_VIEW', 'SOLUTION_DISCOVERY_VIEW', 'SOLUTION_DISCOVERY_CREATE', 'SOLUTION_DISCOVERY_REVIEW',
    ],
  },
  {
    name: 'APPROVING_AUTHORITY',
    displayName: 'Approving Authority',
    description: 'Reviews and authorizes workflow transitions within delegated scope.',
    permissions: [
      'PROBLEM_VIEW',
      'APPROVAL_VIEW', 'APPROVAL_APPROVE', 'APPROVAL_REJECT', 'APPROVAL_SEND_BACK',
    ],
  },
  {
    name: 'TECHNICAL_EVALUATOR',
    displayName: 'Technical Evaluator',
    description: 'Evaluates startup/solution submissions using predefined criteria.',
    permissions: [
      'SOLUTION_VIEW', 'SOLUTION_DISCOVERY_VIEW',
      'EVIDENCE_VIEW',
      'EVALUATION_VIEW', 'EVALUATION_CREATE', 'EVALUATION_SUBMIT',
    ],
  },
  {
    name: 'PILOT_OFFICER',
    displayName: 'Pilot Officer',
    description: 'Manages an approved pilot or sandbox.',
    permissions: [
      'PILOT_VIEW', 'PILOT_CREATE', 'PILOT_MANAGE',
      'EVIDENCE_VIEW', 'EVIDENCE_SUBMIT',
    ],
  },
  {
    name: 'INDEPENDENT_VALIDATOR',
    displayName: 'Independent Validator',
    description: 'Independently examines pilot evidence and determines result validity.',
    permissions: [
      'PILOT_VIEW',
      'EVIDENCE_VIEW',
      'VALIDATION_VIEW', 'VALIDATION_CREATE', 'VALIDATION_SUBMIT',
    ],
  },
  {
    name: 'PROCUREMENT_OFFICER',
    displayName: 'Procurement Officer',
    description: 'Manages procurement activities after the appropriate validation stage.',
    permissions: [
      'PROCUREMENT_VIEW', 'PROCUREMENT_MANAGE',
    ],
  },
  {
    name: 'FINANCE_OFFICER',
    displayName: 'Finance Officer',
    description: 'Manages financial and payment-related activities.',
    permissions: [
      'PAYMENT_VIEW', 'PAYMENT_PROCESS',
    ],
  },
  {
    name: 'SOLUTION_PROVIDER',
    displayName: 'Solution Provider',
    description: 'Startup or company providing an innovation solution to government.',
    permissions: [
      'SOLUTION_VIEW', 'SOLUTION_SUBMIT',
      'EVIDENCE_VIEW', 'EVIDENCE_SUBMIT',
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// DEV USERS
// ─────────────────────────────────────────────────────────────

const DEV_PASSWORD = 'Nivaran@Dev2026!';

const DEV_USERS = [
  { name: 'Dev System Admin',         email: 'admin@nivaran.dev',      role: 'SYSTEM_ADMIN' },
  { name: 'Dev Problem Owner',        email: 'problem@nivaran.dev',    role: 'PROBLEM_OWNER' },
  { name: 'Dev Approving Authority',  email: 'approver@nivaran.dev',   role: 'APPROVING_AUTHORITY' },
  { name: 'Dev Technical Evaluator',  email: 'evaluator@nivaran.dev',  role: 'TECHNICAL_EVALUATOR' },
  { name: 'Dev Pilot Officer',        email: 'pilot@nivaran.dev',      role: 'PILOT_OFFICER' },
  { name: 'Dev Independent Validator',email: 'validator@nivaran.dev',  role: 'INDEPENDENT_VALIDATOR' },
  { name: 'Dev Procurement Officer',  email: 'procurement@nivaran.dev',role: 'PROCUREMENT_OFFICER' },
  { name: 'Dev Finance Officer',      email: 'finance@nivaran.dev',    role: 'FINANCE_OFFICER' },
  { name: 'Dev Solution Provider',    email: 'provider@nivaran.dev',   role: 'SOLUTION_PROVIDER' },
];

// ─────────────────────────────────────────────────────────────
// SEED
// ─────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱  NIVARAN seed starting…');

  // 1. Permissions
  console.log('  Creating permissions…');
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: p.name },
      update: { displayName: p.displayName, module: p.module, isActive: p.isActive ?? true },
      create: {
        name: p.name,
        displayName: p.displayName,
        module: p.module,
        isActive: p.isActive ?? true,
      },
    });
  }

  // 2. Roles + role-permission mapping
  console.log('  Creating roles and role-permissions…');
  for (const r of ROLES) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { displayName: r.displayName, description: r.description, isSystem: r.isSystem ?? false },
      create: {
        name: r.name,
        displayName: r.displayName,
        description: r.description,
        isSystem: r.isSystem ?? false,
      },
    });

    for (const permName of r.permissions) {
      const perm = await prisma.permission.findUnique({ where: { name: permName } });
      if (!perm) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
  }

  // 3. Development Organization + Unit
  console.log('  Creating development organization…');
  const org = await prisma.organization.upsert({
    where: { code: 'DEV_ORG' },
    update: {},
    create: {
      name: 'NIVARAN Development Organization',
      code: 'DEV_ORG',
      description: 'Development-only organization for testing NIVARAN.',
    },
  });

  const unit = await prisma.organizationalUnit.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'DEV_UNIT' } },
    update: {},
    create: {
      name: 'Development Unit',
      code: 'DEV_UNIT',
      organizationId: org.id,
      description: 'Development-only organizational unit.',
    },
  });

  // 4. Dev users
  console.log('  Creating development users…');
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12);

  for (const u of DEV_USERS) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });

    let user;
    if (existing) {
      user = await prisma.user.update({
        where: { email: u.email },
        data: {
          name: u.name,
          organizationId: org.id,
          organizationalUnitId: unit.id,
          status: 'ACTIVE',
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          name: u.name,
          email: u.email,
          passwordHash,
          status: 'ACTIVE',
          organizationId: org.id,
          organizationalUnitId: unit.id,
        },
      });
    }

    const role = await prisma.role.findUnique({ where: { name: u.role } });
    if (role) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        update: {},
        create: { userId: user.id, roleId: role.id },
      });
    }

    console.log(`    ✓ ${u.email}  [${u.role}]`);
  }

  // 5. Development Solution Providers + Solutions (clearly marked dev-only)
  console.log('  Creating development solution catalog…');

  const DEV_PROVIDERS = [
    {
      organizationName: '[DEV] CivicTech Solutions Pvt Ltd',
      providerType: 'STARTUP',
      website: 'https://example-civictech.dev',
      description: '[DEV DATA] A development-only sample startup focused on citizen service delivery platforms.',
      headquarters: 'Bengaluru, India',
      operatingRegions: ['Karnataka', 'Maharashtra', 'Tamil Nadu'],
      domains: ['Citizen Services', 'Urban Governance'],
      capabilities: ['case management', 'workflow automation', 'citizen portal', 'grievance redressal', 'SMS notifications', 'real-time dashboards'],
      sourceType: 'MANUAL_ENTRY',
      verificationStatus: 'UNVERIFIED',
      solutions: [
        {
          name: '[DEV] GrievanceTrack v2',
          description: '[DEV DATA] A development sample solution: end-to-end grievance management platform for urban local bodies.',
          problemAreas: ['citizen complaint resolution', 'grievance tracking', 'SLA management'],
          capabilities: ['case intake', 'automated routing', 'SLA tracking', 'escalation management', 'mobile access', 'analytics dashboard'],
          domains: ['Citizen Services', 'Urban Governance'],
          deploymentModel: 'SaaS / Cloud',
          targetUsers: ['Municipal officers', 'Citizens', 'Department heads'],
          operatingEnvironment: 'Web browser, Android app',
          geographicAvailability: ['India'],
          integrationCapabilities: ['REST API', 'SMS gateway', 'email integration'],
          technologyDescription: '[DEV] Sample tech: cloud-based platform using standard web technologies.',
          evidenceSummary: '[DEV DATA] Claims-only. Not independently verified. For development testing only.',
        },
      ],
    },
    {
      organizationName: '[DEV] WaterSense Analytics',
      providerType: 'COMPANY',
      website: 'https://example-watersense.dev',
      description: '[DEV DATA] Development sample company for water infrastructure monitoring.',
      headquarters: 'Pune, India',
      operatingRegions: ['Maharashtra', 'Gujarat'],
      domains: ['Water & Sanitation', 'Infrastructure'],
      capabilities: ['IoT sensors', 'leakage detection', 'water quality monitoring', 'pressure analytics', 'predictive maintenance'],
      sourceType: 'MANUAL_ENTRY',
      verificationStatus: 'UNVERIFIED',
      solutions: [
        {
          name: '[DEV] AquaMonitor Platform',
          description: '[DEV DATA] Development sample: real-time water network monitoring solution.',
          problemAreas: ['water leakage', 'infrastructure monitoring', 'water quality', 'complaint management'],
          capabilities: ['real-time monitoring', 'anomaly detection', 'automated alerts', 'complaint correlation', 'predictive analytics'],
          domains: ['Water & Sanitation'],
          deploymentModel: 'On-premise + Cloud hybrid',
          targetUsers: ['Water utility engineers', 'Operations teams', 'Municipal administrators'],
          operatingEnvironment: 'Web dashboard, mobile alerts',
          geographicAvailability: ['India'],
          integrationCapabilities: ['SCADA integration', 'REST API', 'IoT protocols'],
          technologyDescription: '[DEV] Sample tech description for testing purposes only.',
          evidenceSummary: '[DEV DATA] No verified deployments. Development seed only.',
        },
      ],
    },
    {
      organizationName: '[DEV] AgriConnect Technologies',
      providerType: 'STARTUP',
      website: 'https://example-agriconnect.dev',
      description: '[DEV DATA] Development sample for agricultural advisory and farmer services.',
      headquarters: 'Hyderabad, India',
      operatingRegions: ['Telangana', 'Andhra Pradesh', 'Maharashtra'],
      domains: ['Agriculture', 'Rural Development'],
      capabilities: ['farmer advisory', 'crop monitoring', 'market linkage', 'weather alerts', 'soil analysis'],
      sourceType: 'MANUAL_ENTRY',
      verificationStatus: 'UNVERIFIED',
      solutions: [
        {
          name: '[DEV] FarmerConnect Advisory',
          description: '[DEV DATA] Development sample: multilingual advisory platform for smallholder farmers.',
          problemAreas: ['farmer advisory', 'agricultural productivity', 'market access', 'weather preparedness'],
          capabilities: ['multilingual IVR', 'SMS advisory', 'crop disease detection', 'market price feeds', 'government scheme information'],
          domains: ['Agriculture', 'Rural Development'],
          deploymentModel: 'SaaS / Mobile-first',
          targetUsers: ['Smallholder farmers', 'Agricultural officers', 'Block-level administrators'],
          operatingEnvironment: 'Feature phone IVR, Android app, SMS',
          geographicAvailability: ['India'],
          integrationCapabilities: ['SMS gateway', 'IVR integration', 'government API'],
          technologyDescription: '[DEV] Sample technology description.',
          evidenceSummary: '[DEV DATA] Development seed record only.',
        },
      ],
    },
    {
      organizationName: '[DEV] EduReach Foundation',
      providerType: 'NON_PROFIT',
      website: 'https://example-edureach.dev',
      description: '[DEV DATA] Development sample non-profit focused on educational technology.',
      headquarters: 'Delhi, India',
      operatingRegions: ['Delhi', 'Uttar Pradesh', 'Bihar'],
      domains: ['Education'],
      capabilities: ['learning management', 'teacher training', 'assessment tools', 'offline content delivery', 'learning analytics'],
      sourceType: 'MANUAL_ENTRY',
      verificationStatus: 'UNVERIFIED',
      solutions: [
        {
          name: '[DEV] LearnTrack Platform',
          description: '[DEV DATA] Development sample: adaptive learning platform for government schools.',
          problemAreas: ['student learning outcomes', 'teacher capacity', 'assessment quality', 'dropout prevention'],
          capabilities: ['adaptive content', 'offline mode', 'teacher dashboard', 'student progress tracking', 'parent notifications'],
          domains: ['Education'],
          deploymentModel: 'Hybrid (offline + sync)',
          targetUsers: ['Students', 'Teachers', 'School administrators', 'District education officers'],
          operatingEnvironment: 'Tablet, low-bandwidth mobile',
          geographicAvailability: ['India'],
          integrationCapabilities: ['UDISE integration', 'SMS gateway'],
          technologyDescription: '[DEV] Sample technology description for testing.',
          evidenceSummary: '[DEV DATA] Development seed only.',
        },
      ],
    },
    {
      organizationName: '[DEV] HealthBridge Systems',
      providerType: 'COMPANY',
      website: 'https://example-healthbridge.dev',
      description: '[DEV DATA] Development sample company for public health data systems.',
      headquarters: 'Chennai, India',
      operatingRegions: ['Tamil Nadu', 'Kerala', 'Karnataka'],
      domains: ['Public Health'],
      capabilities: ['health records', 'disease surveillance', 'telemedicine', 'supply chain tracking', 'field data collection'],
      sourceType: 'MANUAL_ENTRY',
      verificationStatus: 'UNVERIFIED',
      solutions: [
        {
          name: '[DEV] HealthHQ Platform',
          description: '[DEV DATA] Development sample: integrated public health management system.',
          problemAreas: ['patient data management', 'disease surveillance', 'health worker tracking', 'supply chain'],
          capabilities: ['patient registration', 'outbreak alerting', 'ASHA worker tracking', 'medicine inventory', 'telemedicine'],
          domains: ['Public Health'],
          deploymentModel: 'Cloud SaaS',
          targetUsers: ['Health workers', 'District health officers', 'State health department'],
          operatingEnvironment: 'Web, Android, low-bandwidth optimised',
          geographicAvailability: ['India'],
          integrationCapabilities: ['ABDM API', 'CoWIN integration capability', 'NHM reporting'],
          technologyDescription: '[DEV] Sample technology description.',
          evidenceSummary: '[DEV DATA] Development seed only.',
        },
      ],
    },
  ];

  for (const p of DEV_PROVIDERS) {
    const { solutions, ...providerData } = p;
    const provider = await prisma.solutionProvider.upsert({
      where: { id: (await prisma.solutionProvider.findFirst({ where: { organizationName: p.organizationName } }))?.id ?? 'new' },
      update: {},
      create: providerData,
    });
    for (const s of solutions) {
      const existingSolution = await prisma.solution.findFirst({ where: { providerId: provider.id, name: s.name } });
      if (!existingSolution) {
        await prisma.solution.create({ data: { ...s, providerId: provider.id } });
      }
    }
    console.log(`    ✓ Provider: ${p.organizationName}`);
  }

  console.log('\n✅  Seed complete.');
  console.log('\n📋  Development credentials (DEV ONLY — never use in production):');
  console.log('    Password for all dev users:', DEV_PASSWORD);
  console.log('    Users:', DEV_USERS.map(u => u.email).join(', '));
  console.log('\n⚠️   Solution catalog contains DEV-ONLY sample data. Do not present as real verified providers.');
}

main()
  .catch((e) => { console.error('❌  Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
