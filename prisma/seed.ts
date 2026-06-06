import { PrismaClient, Role, CandidateType, CaseStatus, StageType, StageStatus, DocumentKind, AddressType } from "@prisma/client";
import { hash, verify } from "argon2";
import { stagesForCandidateType } from "../src/lib/stages";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Launch Pad...");

  // Settings singleton
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  // ── First-run admin (idempotent: only created if no admin exists yet) ──
  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@elvixit.com").toLowerCase();
  const adminName = process.env.ADMIN_NAME ?? "Launch Pad Admin";
  const adminPasswordPlain = process.env.ADMIN_PASSWORD ?? "Passw0rd!";
  const adminPwd = await hash(adminPasswordPlain);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: adminName,
      role: Role.ADMIN,
      passwordHash: adminPwd,
      emailVerified: new Date(),
    },
  });
  console.log(`Admin user: ${admin.email}`);

  // ── Dedicated BGV operator login (permanent — re-asserted on every deploy) ──
  // Same mailbox that receives the "profile submitted for BGV" notifications, so
  // the person reading that inbox signs in with the same address.
  //
  // BGV_ADMIN_PASSWORD (a deploy secret) is the SOURCE OF TRUTH for this
  // account: role, active, AND the password hash are healed on every run.
  // Create-only password semantics bit us in prod — when ADMIN_EMAIL also
  // points at bgv@elvixit.com, the first-run admin block above creates the row
  // first (with ADMIN_PASSWORD), and a create-only upsert here silently never
  // applies the real secret. Healing also covers secret rotation: rotate the
  // GitHub secret, redeploy, done. (Changing this account's password in the
  // admin UI is therefore intentionally overwritten by the next deploy.)
  // Trimmed to survive a trailing newline pasted into the secret. Skipped when unset.
  const bgvPasswordPlain = process.env.BGV_ADMIN_PASSWORD?.trim();
  if (bgvPasswordPlain) {
    const bgvEmail = "bgv@elvixit.com";
    const existingBgv = await prisma.user.findUnique({ where: { email: bgvEmail } });
    if (!existingBgv) {
      await prisma.user.create({
        data: {
          email: bgvEmail,
          name: "BGV Team",
          role: Role.ADMIN,
          passwordHash: await hash(bgvPasswordPlain),
          emailVerified: new Date(),
        },
      });
      console.log(`BGV admin user: ${bgvEmail} (created)`);
    } else {
      const passwordCurrent = existingBgv.passwordHash
        ? await verify(existingBgv.passwordHash, bgvPasswordPlain).catch(() => false)
        : false;
      await prisma.user.update({
        where: { email: bgvEmail },
        data: {
          role: Role.ADMIN,
          active: true,
          ...(passwordCurrent
            ? {}
            : { passwordHash: await hash(bgvPasswordPlain), mustChangePassword: false }),
        },
      });
      console.log(
        `BGV admin user: ${bgvEmail} (${passwordCurrent ? "password already current" : "password re-asserted from BGV_ADMIN_PASSWORD"})`,
      );
    }
  } else {
    console.log("BGV_ADMIN_PASSWORD not set — skipping bgv@elvixit.com admin seed.");
  }

  // Skip demo seed in production. Set SEED_DEMO=true to force demo data.
  const seedDemo = (process.env.SEED_DEMO ?? "").toLowerCase() === "true"
    || process.env.NODE_ENV !== "production";

  if (!seedDemo) {
    console.log("NODE_ENV=production and SEED_DEMO!=true — skipping demo data.");
    return;
  }

  const pwd = await hash("Passw0rd!");

  const manager = await prisma.user.upsert({
    where: { email: "manager@elvixit.com" },
    update: {},
    create: {
      email: "manager@elvixit.com",
      name: "Mira Manager",
      role: Role.MANAGER,
      passwordHash: pwd,
      emailVerified: new Date(),
    },
  });

  const v1 = await prisma.user.upsert({
    where: { email: "verifier1@elvixit.com" },
    update: {},
    create: {
      email: "verifier1@elvixit.com",
      name: "Vinay Verifier",
      role: Role.VERIFIER,
      passwordHash: pwd,
      emailVerified: new Date(),
    },
  });
  const v2 = await prisma.user.upsert({
    where: { email: "verifier2@elvixit.com" },
    update: {},
    create: {
      email: "verifier2@elvixit.com",
      name: "Veena Verifier",
      role: Role.VERIFIER,
      passwordHash: pwd,
      emailVerified: new Date(),
    },
  });

  // Eric (the CLEARED demo case) must have EVERY required stage approved —
  // his set comes from stagesForCandidateType(CANDIDATE, veteran=true), so
  // build the all-approved override from exactly that (the old hand-rolled
  // list included retired REFERENCE and omitted VETERAN, leaving his CLEARED
  // case with a NOT_STARTED veteran stage).
  const allApproved = Object.fromEntries(
    stagesForCandidateType(CandidateType.CANDIDATE, true).map((s) => [s, StageStatus.APPROVED]),
  ) as Partial<Record<StageType, StageStatus>>;

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
      stageOverrides: allApproved },
    { email: "farah@example.com", name: "Farah Khan", type: CandidateType.CONTRACTOR, position: "Security Consultant", caseStatus: CaseStatus.REJECTED, ref: "LP-2026-0006",
      stageOverrides: { IDENTITY: StageStatus.APPROVED, ADDRESS: StageStatus.APPROVED, EDUCATION: StageStatus.REJECTED } },
  ];

  for (const [i, c] of candidates.entries()) {
    const stages: StageType[] = stagesForCandidateType(c.type, c.veteran);
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
  console.log("  admin@elvixit.com           (ADMIN)");
  console.log("  manager@elvixit.com         (MANAGER)");
  console.log("  verifier1@elvixit.com       (VERIFIER)");
  console.log("  verifier2@elvixit.com       (VERIFIER)");
  console.log("  arjun@example.com .. farah@example.com (CANDIDATES)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
