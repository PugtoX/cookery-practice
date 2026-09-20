/* Callback form wiring: validation, spam guard, and honest failure states.
   The rules themselves live in assets/validate.js so they can be unit tested
   without a browser; this file only touches the DOM.

   Loading: <script type="module" src="assets/form.js"></script> — it is a module
   because it imports validate.js, and a classic script containing `import` is a
   syntax error. Modules are deferred by default, so no `defer` attribute is needed. */

import { validate } from './validate.js'

const form = document.getElementById('callback')
const status = document.getElementById('form-status')

// The endpoint the markup points at. Submitting without JavaScript posts straight
// here, so this is only consulted to decide whether the form is actually connected.
// The check is "is it a usable absolute URL", not "does it still contain a placeholder
// string" — the earlier version keyed off the literal REPLACE_ME, which would have
// silently stopped guarding anything the moment the real id was pasted in.
const ENDPOINT = form?.getAttribute('action') ?? ''
const NOT_CONFIGURED = !/^https?:\/\/\S+$/i.test(ENDPOINT)

function showFieldErrors(errors) {
  for (const field of form.querySelectorAll('input, select, textarea')) {
    if (field.closest('.hp')) continue
    const box = document.getElementById(`${field.id}-error`)
    const message = errors[field.name]
    if (box) {
      box.textContent = message ?? ''
      box.hidden = !message
    }
    if (message) {
      field.setAttribute('aria-invalid', 'true')
      // Point the field at its own message. Without this a screen reader announces
      // "invalid entry" and the summary, but not **why** — the reason is in a
      // sibling element it was never told about. WCAG 3.3.1 / 3.3.3.
      // Neither Lighthouse's accessibility score nor axe's default rule set reports
      // the omission, which is exactly why it is written down here.
      if (box) field.setAttribute('aria-describedby', box.id)
    } else {
      field.removeAttribute('aria-invalid')
      field.removeAttribute('aria-describedby')
    }
  }
}

function setStatus(message, state) {
  status.textContent = message
  status.dataset.state = state
  status.hidden = !message
}

// One submission per minute per browser. Not a security control — localStorage is
// editable — but it stops the accidental double-tap that sends two identical
// requests, which is the realistic case on a phone.
const COOLDOWN_MS = 60_000
const COOLDOWN_KEY = 'callback-last-sent'

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault()

    const data = Object.fromEntries(new FormData(form).entries())
    if (String(data.website ?? '').trim()) return // honeypot: a person never fills this

    const errors = validate(data)
    showFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      const first = form.querySelector('[aria-invalid="true"]')
      first?.focus()
      setStatus('Please check the highlighted fields.', 'error')
      return
    }

    if (NOT_CONFIGURED) {
      // Say so plainly. A form that looks like it worked but goes nowhere is worse
      // than no form at all: the visitor believes they have been in touch and never is.
      setStatus(
        'This form is not connected to a mailbox yet, so nothing was sent. Please use the email address or phone number on the contact page.',
        'error',
      )
      return
    }

    const last = Number(localStorage.getItem(COOLDOWN_KEY) ?? 0)
    if (Date.now() - last < COOLDOWN_MS) {
      setStatus('That request has already been sent. We will be in touch shortly.', 'ok')
      return
    }

    const button = form.querySelector('button[type="submit"]')
    if (button) button.disabled = true
    setStatus('Sending…', 'ok')

    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      localStorage.setItem(COOLDOWN_KEY, String(Date.now()))
      form.reset()
      setStatus('Thanks — your request is with us. We reply within one working day.', 'ok')
    } catch (error) {
      // Never claim success on failure.
      setStatus(
        `That did not send (${error.message}). Please try again, or use the email address or phone number on the contact page.`,
        'error',
      )
    } finally {
      if (button) button.disabled = false
    }
  })
}
