/* Validation rules for the callback form.
   No DOM access in this file on purpose: it is imported by both the browser code
   (assets/form.js) and by `node --test`, so the rules can be exercised directly
   without a browser. Keep it that way — a `document` reference here would break
   the tests, which is the whole reason this file is separate.

   These are browser-side checks only. A visitor can bypass every one of them, so
   passing these tests is not evidence that a message arrives. */

// Caps mirror the maxlength attributes in index.html. Both exist on purpose: the
// attribute stops typing, this stops a script that bypasses the attribute.
export const MAX = { name: 80, contact: 120, notes: 800 }

// Deliberately loose about separators, strict about digit count — phone numbers
// arrive as "+61 400 000 000", "0400 000 000" and "0400000000".
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE = /^\+?[\d\s()-]{8,20}$/
const MIN_DIGITS = 8

export function isContactable(value) {
  const v = String(value ?? '').trim()
  if (EMAIL.test(v)) return true
  return PHONE.test(v) && v.replace(/\D/g, '').length >= MIN_DIGITS
}

/** @returns {Record<string,string>} field name → message. Empty means valid. */
export function validate({ name = '', contact = '', interest = '', notes = '' } = {}) {
  const errors = {}
  const n = String(name).trim()
  if (!n) errors.name = 'Please tell us your name.'
  else if (n.length > MAX.name) errors.name = `That name is too long (${MAX.name} characters maximum).`

  const c = String(contact).trim()
  if (!c) errors.contact = 'Please add an email address or a phone number.'
  else if (!isContactable(c))
    errors.contact = 'That does not look like an email address or a phone number.'
  else if (c.length > MAX.contact)
    errors.contact = `That is too long (${MAX.contact} characters maximum).`

  if (!String(interest).trim()) errors.interest = 'Please choose a class, or “Not sure yet”.'

  // Measured untrimmed: trailing whitespace still counts, because the same string
  // is what the endpoint would receive.
  if (String(notes).length > MAX.notes)
    errors.notes = `That is too long (${MAX.notes} characters maximum).`

  return errors
}
