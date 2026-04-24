/** @jest-environment node */
/**
 * Tests des règles de validation pour l'authentification.
 * Ces règles sont critiques car elles gardent la porte d'entrée de l'app.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HAS_UPPERCASE = /[A-Z]/;
const HAS_NUMBER = /[0-9]/;
const HAS_SPECIAL = /[^A-Za-z0-9]/;
const MIN_LENGTH = 8;

function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email requis';
  if (!EMAIL_RE.test(email.trim())) return 'Email invalide';
  return null;
}

function validatePassword(password: string): string | null {
  if (!password) return 'Mot de passe requis';
  if (password.length < MIN_LENGTH) return `Minimum ${MIN_LENGTH} caractères`;
  if (!HAS_UPPERCASE.test(password)) return 'Au moins une majuscule';
  if (!HAS_NUMBER.test(password)) return 'Au moins un chiffre';
  if (!HAS_SPECIAL.test(password)) return 'Au moins un caractère spécial';
  return null;
}

describe('Validation email', () => {
  it('rejette un email vide', () => {
    expect(validateEmail('')).not.toBeNull();
    expect(validateEmail('   ')).not.toBeNull();
  });

  it('rejette un email sans @', () => {
    expect(validateEmail('notanemail')).not.toBeNull();
  });

  it('rejette un email sans domaine', () => {
    expect(validateEmail('test@')).not.toBeNull();
  });

  it('accepte un email valide', () => {
    expect(validateEmail('test@example.com')).toBeNull();
    expect(validateEmail('user.name+tag@domain.co')).toBeNull();
  });

  it('ignore les espaces autour', () => {
    expect(validateEmail('  test@example.com  ')).toBeNull();
  });
});

describe('Validation mot de passe (register)', () => {
  it('rejette un mot de passe vide', () => {
    expect(validatePassword('')).not.toBeNull();
  });

  it('rejette un mot de passe trop court', () => {
    expect(validatePassword('Ab1!')).not.toBeNull();
  });

  it('rejette sans majuscule', () => {
    expect(validatePassword('abcdef1!')).not.toBeNull();
  });

  it('rejette sans chiffre', () => {
    expect(validatePassword('Abcdefg!')).not.toBeNull();
  });

  it('rejette sans caractère spécial', () => {
    expect(validatePassword('Abcdefg1')).not.toBeNull();
  });

  it('accepte un mot de passe valide', () => {
    expect(validatePassword('Fishbook1!')).toBeNull();
    expect(validatePassword('SecureP@ss99')).toBeNull();
  });
});
