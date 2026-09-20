// Unit tests for the callback form's validation rules.
//
// Run with: npm test   (Node's built-in runner; no framework is installed on purpose)
//
// What these tests are worth: they lock the *browser-side* rules so a later edit
// cannot quietly loosen them. They say nothing about whether a message arrives —
// that is checked once, for real, against the endpoint (stage 10).
//
// Boundary cases are asserted with LITERALS, not with the exported constants.
// Writing `MAX.name + 1` makes the test follow the constant, so changing the limit
// keeps the test green and it stops testing anything. That mistake is recorded in
// web-gzliu/readiness-gate.md (G3) from the sibling project; do not repeat it.

import assert from 'node:assert/strict'
import { test } from 'node:test'

import { isContactable, validate } from '../assets/validate.js'

const valid = { name: 'Sam', contact: 'sam@example.com', interest: 'Pasta From Scratch', notes: '' }

test('accepts a complete, ordinary submission', () => {
  assert.deepEqual(validate(valid), {})
})

test('accepts a phone number instead of an email', () => {
  assert.deepEqual(validate({ ...valid, contact: '+61 400 000 000' }), {})
  assert.deepEqual(validate({ ...valid, contact: '0400 000 000' }), {})
  assert.deepEqual(validate({ ...valid, contact: '0400000000' }), {})
})

test('rejects an empty name', () => {
  assert.ok(validate({ ...valid, name: '   ' }).name)
})

test('rejects a name of 81 characters but accepts 80', () => {
  assert.equal(validate({ ...valid, name: 'a'.repeat(80) }).name, undefined)
  assert.ok(validate({ ...valid, name: 'a'.repeat(81) }).name)
})

test('rejects an empty contact', () => {
  assert.ok(validate({ ...valid, contact: '' }).contact)
})

test('rejects something that is neither an email nor a phone number', () => {
  assert.ok(validate({ ...valid, contact: 'not a contact' }).contact)
  assert.ok(validate({ ...valid, contact: '12345' }).contact) // too few digits
})

test('rejects a contact of 121 characters but accepts 120', () => {
  // A 120-character string that still looks like an email address.
  const local = 'a'.repeat(120 - '@example.com'.length)
  assert.equal(validate({ ...valid, contact: `${local}@example.com` }).contact, undefined)
  assert.ok(validate({ ...valid, contact: `${local}b@example.com` }).contact)
})

test('requires a class to be chosen', () => {
  assert.ok(validate({ ...valid, interest: '' }).interest)
})

test('rejects notes of 801 characters but accepts 800', () => {
  assert.equal(validate({ ...valid, notes: 'n'.repeat(800) }).notes, undefined)
  assert.ok(validate({ ...valid, notes: 'n'.repeat(801) }).notes)
})

test('counts notes untrimmed, because the endpoint receives them untrimmed', () => {
  assert.ok(validate({ ...valid, notes: `${'n'.repeat(800)}   ` }).notes)
})

test('isContactable is not fooled by a bare domain or a partial address', () => {
  assert.equal(isContactable('example.com'), false)
  assert.equal(isContactable('sam@example'), false)
  assert.equal(isContactable('sam@example.com'), true)
})

test('collects every problem at once rather than stopping at the first', () => {
  const errors = validate({ name: '', contact: '', interest: '', notes: 'n'.repeat(801) })
  assert.deepEqual(Object.keys(errors).sort(), ['contact', 'interest', 'name', 'notes'])
})

test('handles an entirely empty call without throwing', () => {
  const errors = validate()
  assert.deepEqual(Object.keys(errors).sort(), ['contact', 'interest', 'name'])
})
