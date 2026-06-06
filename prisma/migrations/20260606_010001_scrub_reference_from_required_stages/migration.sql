-- 20260602_010001_remove_reference_stage deleted REFERENCE Stage rows but left
-- the value inside Case.requiredStages arrays (e.g. webhook-provisioned cases
-- whose portal payload listed REFERENCE). A required stage with no submittable
-- UI can never be approved, permanently blocking those cases from CLEARED.
UPDATE "Case"
   SET "requiredStages" = array_remove("requiredStages", 'REFERENCE')
 WHERE 'REFERENCE' = ANY("requiredStages");
