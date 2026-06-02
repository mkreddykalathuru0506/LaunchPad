-- Standardize legacy "@elivixit.com" (typo: extra "i") email addresses to the
-- real company domain "@elvixit.com". Covers seeded admin/manager/verifier
-- accounts and the Settings BGV support recipient.
--
-- The User update is collision-safe: a row is only renamed when the corrected
-- address is not already taken (e.g. if admin@elvixit.com was created manually
-- to recover access, the old admin@elivixit.com row is left as-is rather than
-- violating the unique(email) constraint).
UPDATE "User"
   SET email = replace(email, '@elivixit.com', '@elvixit.com')
 WHERE email LIKE '%@elivixit.com'
   AND NOT EXISTS (
     SELECT 1 FROM "User" u2
      WHERE u2.email = replace("User".email, '@elivixit.com', '@elvixit.com')
   );

-- BGV support recipient stored on the Settings singleton.
UPDATE "Settings"
   SET "supportEmail" = 'bgv@elvixit.com'
 WHERE "supportEmail" = 'bgv@elivixit.com';

-- Keep the column default in sync with schema.prisma.
ALTER TABLE "Settings" ALTER COLUMN "supportEmail" SET DEFAULT 'bgv@elvixit.com';
