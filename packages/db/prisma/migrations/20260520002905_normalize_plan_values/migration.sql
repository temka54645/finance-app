-- Хуучин plan утгуудыг шинэ 4-tier утга руу map хийнэ.
-- pro     -> small
-- business -> medium
-- free, small, medium, large -> хэвээр
UPDATE "User" SET "plan" = 'small'  WHERE "plan" = 'pro';
UPDATE "User" SET "plan" = 'medium' WHERE "plan" = 'business';

-- Тодорхойгүй / null утгуудыг free болгоно
UPDATE "User" SET "plan" = 'free' WHERE "plan" IS NULL OR "plan" NOT IN ('free', 'small', 'medium', 'large');
