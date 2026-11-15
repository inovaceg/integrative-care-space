import type { PatientRecord } from "./records";

const ageGroups = [
  { label: "0–17", min: 0, max: 17 },
  { label: "18–29", min: 18, max: 29 },
  { label: "30–39", min: 30, max: 39 },
  { label: "40–49", min: 40, max: 49 },
  { label: "50–59", min: 50, max: 59 },
  { label: "60+", min: 60, max: Infinity },
];

export function ageOf(date: string | null): number | null {
  if (!date) return null;
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;
  const today = new Date();
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age -= 1;
  return age >= 0 ? age : null;
}

export function ageGroupCounts(patients: PatientRecord[]) {
  const counts = ageGroups.map((group) => ({ label: group.label, count: 0 }));
  let unknown = 0;
  patients.forEach((patient) => {
    const age = ageOf(patient.data_nascimento);
    if (age === null) { unknown += 1; return; }
    const index = ageGroups.findIndex((group) => age >= group.min && age <= group.max);
    const bucket = counts[index];
    if (bucket) bucket.count += 1;
  });
  return { counts, unknown };
}

export function patientLocality(patient: PatientRecord) {
  return [patient.cidade, patient.estado].filter(Boolean).join(" / ") || patient.cidade_estado || "Não informada";
}

export function patientAgeLabel(patient: PatientRecord) {
  const age = ageOf(patient.data_nascimento);
  return age === null ? "Idade não informada" : `${age} anos`;
}
