import { env } from "../env";
import {
  mockIdentity, mockAddress, mockEducation, mockEmployment,
  mockCriminal, mockPhoto, mockVideo, mockReference,
} from "./mock";

// Provider-named placeholders so swapping is a single-line code change.
// To wire Onfido / Persona / Checkr / AuthBridge / HireRight: implement
// the matching interface in ./providers/<name>.ts and reference it below.

export const identityVerifier =
  env.ADAPTER_IDENTITY === "mock" ? mockIdentity : mockIdentity;
export const addressVerifier =
  env.ADAPTER_ADDRESS === "mock" ? mockAddress : mockAddress;
export const educationVerifier =
  env.ADAPTER_EDUCATION === "mock" ? mockEducation : mockEducation;
export const employmentVerifier =
  env.ADAPTER_EMPLOYMENT === "mock" ? mockEmployment : mockEmployment;
export const criminalVerifier =
  env.ADAPTER_CRIMINAL === "mock" ? mockCriminal : mockCriminal;
export const photoVerifier =
  env.ADAPTER_PHOTO === "mock" ? mockPhoto : mockPhoto;
export const videoVerifier =
  env.ADAPTER_VIDEO === "mock" ? mockVideo : mockVideo;
export const referenceVerifier =
  env.ADAPTER_REFERENCE === "mock" ? mockReference : mockReference;
