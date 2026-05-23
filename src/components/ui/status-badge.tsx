import { StageStatus, CaseStatus } from "@prisma/client";
import { Badge } from "./badge";
import { stageStatusLabels, caseStatusLabels, statusTone } from "@/lib/utils";

export function StageStatusBadge({ status }: { status: StageStatus }) {
  return <Badge tone={statusTone(status)}>{stageStatusLabels[status]}</Badge>;
}

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  return <Badge tone={statusTone(status)}>{caseStatusLabels[status]}</Badge>;
}
