/**
 * Capitalises the first letter of every word, leaving the rest of each word
 * alone so acronyms and deliberate casing survive: `evans kwofie` becomes
 * `Evans Kwofie`, while `ACME` and `McCarthy` are untouched.
 *
 * Words are split on whitespace, hyphens and apostrophes, so `jean-luc` and
 * `o'brien` capitalise the way names are written.
 */
export function toCapitalised(value: string): string {
  return value.replace(/(^|[\s\-'’])(\p{L})/gu, (_match, boundary: string, letter: string) => {
    return boundary + letter.toUpperCase();
  });
}
