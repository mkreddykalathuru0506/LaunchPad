import { PrismaClient, Role, CandidateType, CaseStatus, StageType, StageStatus, DocumentKind, AddressType } from "@prisma/client";
import { hash } from "argon2";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Launch Pad...");

  // Settings singleton
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  const pwd = await hash("Passw0rd!");

  const admin = await prisma.user.upsert({
    where: { email: "admin@elivixit.com" },
    update: {},
    create: {
      email: "admin@elivixit.com",
      name: "Anita Admin",
      role: Role.ADMIN,
      passwordHash: pwd,
      emailVerified: new Date(),
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@elivixit.com" },
    update: {},
    create: {
      email: "manager@elivixit.com",
      name: "Mira Manager",
      role: Role.MANAGER,
      passwordHash: pwd,
      emailVerified: new Date(),
    },
  });

  const v1 = await prisma.user.upsert({
    where: { email: "verifier1@elivixit.com" },
    update: {},
    create: {
      email: "verifier1@elivixit.com",
      name: "Vinay Verifier",
      role: Role.VERIFIER,
      passwordHash: pwd,
      emailVerified: new Date(),
    },
  });
  const v2 = await prisma.user.upsert({
    where: { email: "verifier2@elivixit.com" },
    update: {},
    create: {
      email: "verifier2@elivixit.com",
      name: "Veena Verifier",
      role: Role.VERIFIER,
      passwordHash: pwd,
      emailVerified: new Date(),
    },
  });

  const defaultStages: StageType[] = [
    StageType.IDENTITY,
    StageType.ADDRESS,
    StageType.EDUCATION,
    StageType.EMPLOYMENT,
    StageType.CRIMINAL,
    StageType.PHOTO,
    StageType.VIDEO,
    StageType.REFERENCE,
  ];

  type SeedCandidate = {
    email: string;
    name: string;
    type: CandidateType;
    position: string;
    veteran?: boolean;
    caseStatus: CaseStatus;
    stageOverrides?: Partial<Record<StageType, StageStatus>>;
    ref: string;
  };

  const candidates: SeedCandidate[] = [
    { email: "arjun@example.com", name: "Arjun Rao", type: CandidateType.INTERN, position: "Software Intern", caseStatus: CaseStatus.DRAFT, ref: "LP-2026-0001", stageOverrides: {} },
    { email: "bella@example.com", name: "Bella Singh", type: CandidateType.CANDIDATE, position: "Backend Engineer", caseStatus: CaseStatus.IN_PROGRESS, ref: "LP-2026-0002",
      stageOverrides: { IDENTITY: StageStatus.APPROVED, ADDRESS: StageStatus.SUBMITTED, EDUCATION: StageStatus.IN_PROGRESS } },
    { email: "chen@example.com", name: "Chen Liu", type: CandidateType.CANDIDATE, position: "Data Engineer", caseStatus: CaseStatus.AWAITING_REVIEW, ref: "LP-2026-0003",
      stageOverrides: { IDENTITY: StageStatus.SUBMITTED, ADDRESS: StageStatus.SUBMITTED, EDUCATION: StageStatus.SUBMITTED, EMPLOYMENT: StageStatus.SUBMITTED } },
    { email: "deepa@example.com", name: "Deepa Iyer", type: CandidateType.TRAINER, position: "Cloud Trainer", caseStatus: CaseStatus.NEEDS_CORRECTION, ref: "LP-2026-0004",
      stageOverrides: { IDENTITY: StageStatus.APPROVED, ADDRESS: StageStatus.NEEDS_CORRECTION, EDUCATION: StageStatus.APPROVED, EMPLOYMENT: StageStatus.UNDER_REVIEW } },
    { email: "eric@example.com", name: "Eric Johnson", type: CandidateType.CANDIDATE, position: "Senior SRE", veteran: true, caseStatus: CaseStatus.CLEARED, ref: "LP-2026-0005",
      stageOverrides: Object.fromEntries(defaultStages.map(s => [s, StageStatus.APPROVED])) as Partial<Record<StageType, StageStatus>> },
    { email: "farah@example.com", name: "Farah Khan", type: CandidateType.CONTRACTOR, position: "Security Consultant", caseStatus: CaseStatus.REJECTED, ref: "LP-2026-0006",
      stageOverrides: { IDENTITY: StageStatus.APPROVED, ADDRESS: StageStatus.APPROVED, EDUCATION: StageStatus.REJECTED } },
  ];

  for (const [i, c] of candidates.entries()) {
    const stages: StageType[] = c.veteran ? [...defaultStages, StageType.VETERAN] : defaultStages;
    const u = await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: {
        email: c.email,
        name: c.name,
        role: Role.CANDIDATE,
        passwordHash: pwd,
        emailVerified: new Date(),
      },
    });
    const cand = await prisma.candidate.upsert({
      where: { userId: u.id },
      update: {},
      create: {
        userId: u.id,
        candidateType: c.type,
        positionTitle: c.position,
        hiringManager: "Mira Manager",
        phone: `+1-555-010${i}-000${i}`,
        legalFirstName: c.name.split(" ")[0],
        legalLastName: c.name.split(" ").slice(1).join(" "),
        nationality: "USA",
        isVeteran: !!c.veteran,
        startDate: new Date(Date.now() + (30 + i) * 86400000),
      },
    });

    const kase = await prisma.case.upsert({
      where: { candidateId: cand.id },
      update: {},
      create: {
        candidateId: cand.id,
        reference: c.ref,
        status: c.caseStatus,
        assignedVerifierId: i % 2 === 0 ? v1.id : v2.id,
        managedById: manager.id,
        requiredStages: stages,
        clearedAt: c.caseStatus === CaseStatus.CLEARED ? new Date() : null,
        rejectedAt: c.caseStatus === CaseStatus.REJECTED ? new Date() : null,
      },
    });

    for (const st of stages) {
      const status = c.stageOverrides?.[st] ?? StageStatus.NOT_STARTED;
      await prisma.stage.upsert({
        where: { caseId_type: { caseId: kase.id, type: st } },
        update: { status },
        create: { caseId: kase.id, type: st, status },
      });
    }

    // Seed a current address and one education record for non-empty candidates
    if (c.caseStatus !== CaseStatus.DRAFT) {
      await prisma.address.create({
        data: {
          caseId: kase.id,
          type: AddressType.CURRENT,
          line1: `${100 + i} Main St`,
          city: "Plano",
          state: "TX",
          postalCode: "75024",
          country: "USA",
          isCurrent: true,
          fromDate: new Date(Date.now() - 365 * 86400000),
        },
      });
      // Seed all 3 mandatory levels for Indian candidates
      await prisma.education.createMany({
        data: [
          {
            caseId: kase.id,
            level: "SSC",
            board: "CBSE",
            institution: "Delhi Public School",
            degree: "10th / SSC",
            rollNumber: `SSC-${10000 + i}`,
            startDate: new Date("2014-06-01"),
            endDate: new Date("2016-04-30"),
            gpa: "92%",
            registrarEmail: "principal@dpsdummy.in",
          },
          {
            caseId: kase.id,
            level: "Intermediate",
            board: "Telangana Board of Intermediate Education",
            institution: "Sri Chaitanya Junior College",
            degree: "12th / Intermediate",
            fieldOfStudy: "MPC",
            rollNumber: `INT-${20000 + i}`,
            startDate: new Date("2016-06-01"),
            endDate: new Date("2018-04-30"),
            gpa: "88%",
            registrarEmail: "principal@chaitanyadummy.in",
          },
          {
            caseId: kase.id,
            level: "Bachelor",
            board: "Osmania University",
            institution: "CBIT",
            degree: "B.Tech",
            fieldOfStudy: "Computer Science & Engineering",
            rollNumber: `OU-${30000 + i}`,
            startDate: new Date("2018-08-01"),
            endDate: new Date("2022-05-15"),
            gpa: "8.6 CGPA",
            registrarEmail: "registrar@ou.ac.in",
          },
        ],
      });
    }

    await prisma.auditEvent.create({
      data: {
        actorId: admin.id,
        caseId: kase.id,
        action: "case.created",
        metadata: { reference: kase.reference },
      },
    });
  }

  console.log("Seed complete.");
  console.log("Login with any of the following (password: Passw0rd!):");
  console.log("  admin@elivixit.com           (ADMIN)");
  console.log("  manager@elivixit.com         (MANAGER)");
  console.log("  verifier1@elivixit.com       (VERIFIER)");
  console.log("  verifier2@elivixit.com       (VERIFIER)");
  console.log("  arjun@example.com .. farah@example.com (CANDIDATES)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
