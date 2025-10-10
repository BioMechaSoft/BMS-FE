// Utility functions for Age <-> DOB conversion

export function dobToAge(dob) {
  if (!dob) return '';
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function ageToDob(age) {
  if (!age || isNaN(age)) return '';
  const today = new Date();
  const birthYear = today.getFullYear() - Number(age);
  // Set to July 1st for mid-year DOB if not specified
  return new Date(birthYear, 6, 1).toISOString().split('T')[0];
}
