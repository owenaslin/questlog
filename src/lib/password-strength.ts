export type PasswordStrengthLevel = "very_weak" | "weak" | "fair" | "good" | "strong";

export type PasswordStrength = {
  score: number;
  level: PasswordStrengthLevel;
  label: string;
};

export function evaluatePasswordStrength(password: string): PasswordStrength {
  let score = 0;

  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { score, level: "very_weak", label: "Very Weak" };
  if (score === 2) return { score, level: "weak", label: "Weak" };
  if (score === 3) return { score, level: "fair", label: "Fair" };
  if (score === 4 || score === 5) return { score, level: "good", label: "Good" };
  return { score, level: "strong", label: "Strong" };
}
