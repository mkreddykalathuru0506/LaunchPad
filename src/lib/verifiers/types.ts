// Verification adapter interfaces. Concrete implementations live alongside.
// Real providers (Onfido, Persona, Checkr, AuthBridge, HireRight) plug in
// by implementing these and being selected via env vars.

export type AdapterResult<T = unknown> = {
  decision: "pass" | "fail" | "review";
  score?: number;
  reasons?: string[];
  reference?: string;
  raw?: T;
};

export interface IdentityVerifier {
  verifyDocument(input: {
    fullName: string;
    dob?: string | null;
    documentType: string;
    documentNumber?: string;
    documentImagePath?: string;
  }): Promise<AdapterResult>;
}

export interface AddressVerifier {
  verifyAddress(input: {
    fullName: string;
    line1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    proofPath?: string;
  }): Promise<AdapterResult>;
}

export interface EducationVerifier {
  verifyEducation(input: {
    fullName: string;
    institution: string;
    degree: string;
    startDate: string;
    endDate?: string | null;
    registrarEmail?: string;
  }): Promise<AdapterResult>;
}

export interface EmploymentVerifier {
  verifyEmployment(input: {
    fullName: string;
    employer: string;
    title: string;
    startDate: string;
    endDate?: string | null;
    managerEmail?: string;
  }): Promise<AdapterResult>;
}

export interface CriminalVerifier {
  runCheck(input: {
    fullName: string;
    dob?: string | null;
    jurisdictions: string[];
    ssnEncrypted?: string | null;
    consentId: string;
  }): Promise<AdapterResult>;
}

export interface PhotoVerifier {
  compareFaces(input: { idPhotoPath: string; selfiePath: string }): Promise<AdapterResult>;
  livenessCheck(input: { selfiePath: string }): Promise<AdapterResult>;
}

export interface VideoVerifier {
  verifyRecording(input: { recordingPath: string; promptedPhrase: string }): Promise<AdapterResult>;
}

export interface ReferenceVerifier {
  contactReference(input: {
    candidateName: string;
    referenceName: string;
    referenceEmail: string;
    relationship: string;
  }): Promise<AdapterResult>;
}
