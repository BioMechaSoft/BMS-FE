// Utility to generate NIC from phone and age (returns 13 digits)
export function makeNIC(phone, age) {
  // phone: string of 11 digits, age: number or string
  if (!phone || phone.length !== 11 || !age) return '';
  // Use last 2 digits of (current year - age) as birth year
  const now = new Date();
  const birthYear = (now.getFullYear() - Number(age)).toString().slice(-2);
  // NIC: phone (11) + birthYear (2) = 13 digits
  return phone + birthYear;
}
