-- Харьцагчийн НЭР болон харьцсан дансны ДУГААР-ыг тусад нь хадгална.
ALTER TABLE "Transaction" ADD COLUMN "counterpartyName" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "counterpartyAccount" TEXT;

-- Хуучин мөрүүдийг legacy `counterparty` стрингээс задлан backfill хийнэ:
--   1) "нэр · дугаар" хосолсон (Төрийн банк) → ` · `-аар салгана.
--   2) Зөвхөн цэвэр дугаар (зай/зураас/· хассаны дараа 6+ орон) → дансны дугаар.
--   3) Бусад (үсэг агуулсан) → нэр.
-- Тэмдэглэл: Голомтын хуучин мөрүүдэд дугаар нь хадгалагдаагүй (parser хаядаг
-- байсан) тул зөвхөн дахин upload хийсэн хуулгад л дугаар бүрэн орно.
UPDATE "Transaction"
SET
  "counterpartyName" = CASE
    WHEN "counterparty" LIKE '% · %'
      THEN NULLIF(btrim(split_part("counterparty", ' · ', 1)), '')
    WHEN regexp_replace("counterparty", '[\s\-·]', '', 'g') ~ '^\d{6,}$'
      THEN NULL
    ELSE "counterparty"
  END,
  "counterpartyAccount" = CASE
    WHEN "counterparty" LIKE '% · %'
      THEN NULLIF(btrim(split_part("counterparty", ' · ', 2)), '')
    WHEN regexp_replace("counterparty", '[\s\-·]', '', 'g') ~ '^\d{6,}$'
      THEN regexp_replace("counterparty", '[\s\-·]', '', 'g')
    ELSE NULL
  END
WHERE "counterparty" IS NOT NULL AND btrim("counterparty") <> '';
