// Utility functions for Age <-> DOB conversion

// Utility: return years, months and days between dob and today
export function dobToAgeParts(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  if (isNaN(birth.getTime())) return null;

  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  let days = today.getDate() - birth.getDate();

  if (days < 0) {
    // borrow days from previous month
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prevMonth.getDate();
    months -= 1;
  }

  if (months < 0) {
    months += 12;
    years -= 1;
  }

  if (years < 0) return { years: 0, months: 0, days: 0 };

  return { years, months, days };
}

function plural(n, singular, pluralForm) {
  if (n === 1) return `${n} ${singular}`;
  return `${n} ${pluralForm || singular + 's'}`;
}

export function formatAge(parts) {
  if (!parts) return '';
  const { years = 0, months = 0, days = 0 } = parts;
  return `${plural(years, 'year', 'years')} ${plural(months, 'month', 'months')} ${plural(days, 'day', 'days')}`.trim();
}

// Backwards-compatible: returns formatted age string for display
export function dobToAge(dob) {
  const parts = dobToAgeParts(dob);
  return parts ? formatAge(parts) : '';
}

export function ageToDob(age) {
  if (age === undefined || age === null || isNaN(age)) return '';
  const today = new Date();
  const birthYear = today.getFullYear() - Number(age);
  // Set to July 1st for mid-year DOB if not specified
  return new Date(birthYear, 6, 1).toISOString().split('T')[0];
}
