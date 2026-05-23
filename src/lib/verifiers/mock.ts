import type {
  IdentityVerifier, AddressVerifier, EducationVerifier, EmploymentVerifier,
  CriminalVerifier, PhotoVerifier, VideoVerifier, ReferenceVerifier, AdapterResult,
} from "./types";

function decide(seed: string, passWeight = 0.75): AdapterResult {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const score = (h % 1000) / 1000;
  if (score < passWeight) return { decision: "pass", score, reference: `mock-${h.toString(16)}` };
  if (score < passWeight + 0.15) return { decision: "review", score, reasons: ["Borderline match score"], reference: `mock-${h.toString(16)}` };
  return { decision: "fail", score, reasons: ["Mismatch detected"], reference: `mock-${h.toString(16)}` };
}

export const mockIdentity: IdentityVerifier = {
  async verifyDocument(input) { return decide(`id:${input.fullName}:${input.documentType}`); },
};
export const mockAddress: AddressVerifier = {
  async verifyAddress(input) { return decide(`addr:${input.fullName}:${input.postalCode}`); },
};
export const mockEducation: EducationVerifier = {
  async verifyEducation(input) { return decide(`edu:${input.fullName}:${input.institution}:${input.degree}`); },
};
export const mockEmployment: EmploymentVerifier = {
  async verifyEmployment(input) { return decide(`emp:${input.fullName}:${input.employer}`); },
};
export const mockCriminal: CriminalVerifier = {
  async runCheck(input) { return decide(`crim:${input.fullName}:${input.jurisdictions.join(",")}`, 0.85); },
};
export const mockPhoto: PhotoVerifier = {
  async compareFaces(input) { return decide(`face:${input.idPhotoPath}:${input.selfiePath}`); },
  async livenessCheck(input) { return decide(`live:${input.selfiePath}`); },
};
export const mockVideo: VideoVerifier = {
  async verifyRecording(input) { return decide(`vid:${input.recordingPath}`); },
};
export const mockReference: ReferenceVerifier = {
  async contactReference(input) { return decide(`ref:${input.candidateName}:${input.referenceEmail}`); },
};
