-- Email баталгаажуулалт ажиллах болсон тул хуучин хэрэглэгчдийг блоклохгүйн тулд
-- emailVerified-ийг createdAt-аар бөглөнө.
UPDATE "User" SET "emailVerified" = "createdAt" WHERE "emailVerified" IS NULL;
