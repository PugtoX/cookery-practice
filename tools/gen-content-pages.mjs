#!/usr/bin/env node
// One-off generator for recipes / about / contact / privacy / terms.
//
// Uses the shared shell in emit-page.mjs so all five carry the same head, nav and
// footer. Body copy is per-page data below. Re-run only when a structural change has
// to reach all of them; otherwise edit the HTML by hand.
//
// Usage: node tools/gen-content-pages.mjs

import { fileURLToPath } from 'node:url'
import { renderPage, writePage, ORIGIN, SITE_NAME } from './emit-page.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))

const p = (s) => `          <p>${s}</p>`
const pm = (s) => `          <p class="muted">${s}</p>`
const ul = (items) => `          <ul>\n${items.map((x) => `            <li>${x}</li>`).join('\n')}\n          </ul>`
const facts = (rows) =>
  `          <dl class="facts">\n${rows
    .map(([k, v]) => `            <div>\n              <dt>${k}</dt>\n              <dd>${v}</dd>\n            </div>`)
    .join('\n')}\n          </dl>`

// A tiny structured-data helper: every page gets a WebPage that names the site.
const webPage = (name, slug, description) => ({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name,
  description,
  url: `${ORIGIN}/${slug}`,
  isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${ORIGIN}/` },
})

const pages = [
  {
    file: 'recipes.html',
    slug: 'recipes',
    title: 'Recipes We Cook in Class — Knife Skills, Bread and Pasta | Cookery Class',
    description:
      'The recipes we cook in class, written for a home kitchen: a knife-cut soup base, a no-knead loaf schedule, hand-rolled pasta dough and a market sauce.',
    ogTitle: 'Recipes We Cook in Class',
    eyebrow: 'Four recipes · home kitchen',
    h1: 'Recipes from our Sydney cooking classes',
    lede:
      'Every recipe here is one we cook in class, rewritten for a normal kitchen with normal equipment. Nothing needs a machine you would have to buy.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Recipes from our cooking classes',
      url: `${ORIGIN}/recipes`,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${ORIGIN}/` },
      hasPart: [
        { '@type': 'Recipe', name: 'Knife-cut vegetable soup', url: `${ORIGIN}/recipes#soup` },
        { '@type': 'Recipe', name: 'Straight dough white loaf', url: `${ORIGIN}/recipes#loaf` },
        { '@type': 'Recipe', name: 'Hand-rolled egg pasta', url: `${ORIGIN}/recipes#pasta` },
        { '@type': 'Recipe', name: 'Market pan sauce', url: `${ORIGIN}/recipes#sauce` },
      ],
    },
    sections: [
      {
        id: 'soup',
        heading: 'Knife-cut vegetable soup',
        html: `${pm('From <a href="classes/knife-skills.html">Knife Skills Basics</a> · serves 4 · 45 minutes')}
${p('This is the recipe we use to practise cuts. It is forgiving on purpose — how evenly you cut is the only thing that changes the result, which is the point of the class.')}
${ul([
  '2 onions, 2 carrots, half a cabbage, 2 potatoes',
  '1.5 litres stock, or water and a stock cube',
  'Oil, salt, pepper, a bay leaf',
])}
${p('<strong>Method.</strong> Dice everything to the same size — roughly 1cm. Sweat the onion in oil over a medium heat until translucent, about 6 minutes. Add carrot and potato, cook 4 minutes more. Add cabbage, stock and bay, simmer 20 minutes until the potato gives way to a knife. Season at the end, not the start.')}
${pm('If some pieces are still firm when others are soft, that is a cutting problem, not a cooking problem.')}`,
      },
      {
        id: 'loaf',
        heading: 'Straight dough white loaf',
        html: `${pm('From <a href="classes/bread-baking.html">Bread Baking Fundamentals</a> · one loaf · about 4 hours, mostly waiting')}
${p('No starter required. This is the loaf we bake first in class, so that the starter you take home has something to be compared against.')}
${ul([
  '500g strong white flour',
  '350g water at room temperature',
  '10g salt, 7g instant yeast',
])}
${p('<strong>Method.</strong> Mix everything until no dry flour remains, then leave it covered for 30 minutes. Stretch and fold four times over the next two hours, one every 30 minutes. Shape into a tight ball, proof in a floured basket for 60–90 minutes until a floured finger springs back slowly. Bake in a covered pot at 230°C for 20 minutes, then uncovered at 210°C for 25.')}
${pm('A dense loaf is almost always under-proofed or under-baked, in that order.')}`,
      },
      {
        id: 'pasta',
        heading: 'Hand-rolled egg pasta',
        html: `${pm('From <a href="classes/pasta-from-scratch.html">Pasta From Scratch</a> · serves 4 · 40 minutes plus 30 resting')}
${ul(['300g “00” flour', '3 eggs', 'A pinch of salt', 'Semolina, for dusting']) }
${p('<strong>Method.</strong> Mound the flour, make a well, add the eggs and salt. Draw the flour in with a fork, then knead 8 minutes until smooth and slightly tacky. Rest covered for 30 minutes. Roll by hand on a floured bench until you can see the shadow of your hand through it. Cut into tagliatelle, dust with semolina, and cook for 2–3 minutes in well-salted water.')}
${pm('If the dough tore while rolling, it needed more rest, not more flour.')}`,
      },
      {
        id: 'sauce',
        heading: 'Market pan sauce',
        html: `${pm('From <a href="classes/market-table.html">Saturday Market Table</a> · enough for 4 · 20 minutes')}
${p('A method rather than a fixed recipe: it is what we build at the end of the market class from whatever looked good that morning.')}
${ul([
  'Aromatics: onion, garlic, or leek',
  'Something with body: tomatoes, mushrooms, or greens',
  'A fat, an acid, and a splash of the pasta or vegetable water',
])}
${p('<strong>Method.</strong> Soften the aromatics in the fat. Add the body ingredient and cook until it collapses. Add the cooking water and reduce until it coats a spoon. Finish off the heat with the acid — lemon, vinegar, or wine — and taste again before serving.')}
${pm('The cooking water is the ingredient most people pour away and then wonder why the sauce will not come together.')}`,
      },
    ],
  },

  {
    file: 'about.html',
    slug: 'about',
    title: 'About Our Sydney Cooking School — Small Classes, Real Kitchen | Cookery Class',
    description:
      'We run hands-on cooking classes in Sydney for eight people at a time. One bench each, a working kitchen, and a teacher who cooks alongside you rather than demonstrating.',
    ogTitle: 'About Our Sydney Cooking School',
    eyebrow: 'Eight people · one bench each',
    h1: 'A small cooking school in Sydney',
    lede:
      'We teach cooking the way it is learned at home — by doing it, badly at first, with someone standing next to you who can see what went wrong.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: 'About Cookery Class',
      url: `${ORIGIN}/about`,
      mainEntity: {
        '@type': 'CookingSchool',
        name: SITE_NAME,
        url: `${ORIGIN}/`,
        description: 'Hands-on cooking classes in Sydney for eight people at a time.',
        address: {
          '@type': 'PostalAddress',
          streetAddress: '12 Example Lane',
          addressLocality: 'Sydney',
          addressRegion: 'NSW',
          postalCode: '2000',
          addressCountry: 'AU',
        },
      },
    },
    sections: [
      {
        id: 'why',
        heading: 'Why eight people',
        html: `${p('Eight is the largest group where everyone can hold a knife at the same time without waiting for a bench. It also means we can see what each person is doing and correct it in the moment, which is the only part of learning to cook that a video cannot do.')}
${pm('Larger classes are cheaper to run and worse to be in. We are not going to run them.')}`,
      },
      {
        id: 'how',
        heading: 'How we teach',
        html: `${ul([
  'We cook alongside you rather than demonstrating from the front.',
  'We explain the reason behind a step, so you can apply it to a different recipe.',
  'We tell you when something is good enough, because most home cooking fails from over-correcting.',
  'We keep the equipment ordinary: nothing in class needs a machine you do not own.',
])}
${p('Every class ends with a sit-down meal. Cooking something and then not eating it is a demonstration, not a class.')}`,
      },
      {
        id: 'where',
        heading: 'Where we are',
        html: `${p('We are in the city, a short walk from the station. The kitchen is a working one — we cook in it every week, and it is set up for eight people to work at once.')}
${facts([
  ['Address', '12 Example Lane, Sydney NSW 2000'],
  ['Getting here', 'Five minutes from the station; street parking after 6pm'],
  ['Accessibility', 'Step-free entry and an accessible bathroom'],
])}`,
      },
      {
        id: 'who',
        heading: 'Who teaches',
        html: `${p('Classes are taught by people who have cooked professionally and then chose to teach, rather than by presenters reading a script. Every teacher has run a commercial kitchen service within the last five years.')}
${pm('If you want to know who is teaching a specific date before you book, ask us and we will tell you.')}`,
      },
    ],
  },

  {
    file: 'contact.html',
    slug: 'contact',
    title: 'Contact and Opening Hours — Sydney Cooking School | Cookery Class',
    description:
      'Contact our Sydney cooking school: email, phone, address and opening hours. We reply to every enquiry within one working day.',
    ogTitle: 'Contact and Opening Hours',
    eyebrow: 'One working day reply',
    h1: 'Contact Cookery Class',
    lede:
      'Email or phone is fastest. If you would rather we called you, the home page has a callback form and we will get back to you within one working day.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: 'Contact Cookery Class',
      url: `${ORIGIN}/contact`,
      mainEntity: {
        '@type': 'CookingSchool',
        name: SITE_NAME,
        url: `${ORIGIN}/`,
        email: 'hello@example.com',
        telephone: '+61-2-0000-0000',
        address: {
          '@type': 'PostalAddress',
          streetAddress: '12 Example Lane',
          addressLocality: 'Sydney',
          addressRegion: 'NSW',
          postalCode: '2000',
          addressCountry: 'AU',
        },
        openingHoursSpecification: [
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Wednesday', 'Thursday', 'Friday'],
            opens: '17:00',
            closes: '21:00',
          },
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Saturday', 'Sunday'],
            opens: '09:00',
            closes: '17:00',
          },
        ],
      },
    },
    sections: [
      {
        id: 'reach',
        heading: 'How to reach us',
        html: `${facts([
  ['Email', '<a class="link-block" href="mailto:hello@example.com">hello@example.com</a>'],
  ['Phone', '<a class="link-block" href="tel:+61200000000">(02) 0000 0000</a>'],
  ['Address', '12 Example Lane, Sydney NSW 2000'],
  ['Reply time', 'Within one working day, including weekends during class season'],
])}
${pm('Email is better for allergy and dietary questions, because we will want to check with the teacher before answering.')}`,
      },
      {
        id: 'hours',
        heading: 'Opening hours',
        html: `${facts([
  ['Monday – Tuesday', 'Closed'],
  ['Wednesday – Friday', '5pm – 9pm'],
  ['Saturday – Sunday', '9am – 5pm'],
])}
${pm('We are in the kitchen during class times, so the phone may go to voicemail. Leave a number and we will call back.')}`,
      },
      {
        id: 'other',
        heading: 'Before you book',
        html: `${p('Two things worth telling us when you get in touch: any allergy or dietary requirement, and whether you are booking for a group. Both change what we can put on that date.')}
${p('For a private booking or a corporate group, tell us the date you have in mind and roughly how many people, and we will come back with what is possible.')}`,
      },
    ],
  },

  {
    file: 'privacy.html',
    slug: 'privacy',
    robots: 'noindex, follow',
    title: 'Privacy Policy — What We Do With Your Details | Cookery Class',
    description:
      'How Cookery Class handles the details you send us through the callback form, by email or by phone, and how to ask us to delete them.',
    ogTitle: 'Privacy Policy',
    eyebrow: 'Legal',
    h1: 'Privacy policy',
    lede:
      'This page explains what we do with the details you send us. It is short because we collect very little.',
    jsonLd: webPage('Privacy policy', 'privacy', 'How Cookery Class handles the details you send us.'),
    sections: [
      {
        id: 'collect',
        heading: 'What we collect',
        html: `${p('If you use the callback form, we receive the name, the email address or phone number, the class you are asking about and any notes you add. If you email or call us instead, we receive whatever you choose to send.')}
${pm('We do not use analytics or advertising cookies on this site, and we do not track you across other sites.')}`,
      },
      {
        id: 'use',
        heading: 'What we do with it',
        html: `${p('We use your details to answer your enquiry and, if you book, to run the class you booked. That is all.')}
${p('We do not sell your details, and we do not add you to a mailing list unless you ask us to.')}`,
      },
      {
        // The callback form posts to Formspree, which transmits and stores the message
        // on our behalf — so the details do pass through a third party before we ever
        // see them, and it is that service which decides whether a message looks like
        // spam. Omitting this made the page contradict how the site actually works.
        id: 'processors',
        heading: 'Who else handles it',
        html: `${p('The callback form on this site is delivered by <a href="https://formspree.io/" rel="noopener">Formspree</a>, a form-handling service. When you submit the form, your details are sent to Formspree, which forwards them to our mailbox and stores a copy. Formspree also screens submissions for spam. Its own privacy policy governs what it does with the data while it holds it.')}
${pm('The statement above still stands: we run no analytics and no advertising cookies ourselves, and we do not track you across other sites.')}`,
      },
      {
        id: 'keep',
        heading: 'How long we keep it',
        html: `${p('Enquiries that do not turn into a booking are deleted within twelve months. Booking records are kept for seven years because tax law requires it.')}
${pm('Messages held by Formspree are subject to that service\\u2019s own retention, not ours; removing them there is part of the deletion described below.')}`,
      },
      {
        id: 'delete',
        heading: 'Asking us to delete it',
        html: `${p('Email <a href="mailto:hello@example.com">hello@example.com</a> and ask. We will delete what we hold and confirm that we have done it, unless the law requires us to keep a booking record.')}`,
      },
    ],
  },

  {
    file: 'terms.html',
    slug: 'terms',
    robots: 'noindex, follow',
    title: 'Booking Terms — Cancellations, Transfers and Allergies | Cookery Class',
    description:
      'Booking terms for Cookery Class: how to cancel or transfer a class, what happens if we cancel, and how we handle allergies and dietary requirements.',
    ogTitle: 'Booking Terms',
    eyebrow: 'Legal',
    h1: 'Booking terms',
    lede:
      'The short version: tell us early if you cannot come, and tell us about allergies when you book rather than when you arrive.',
    jsonLd: webPage('Booking terms', 'terms', 'Cancellations, transfers and allergies for Cookery Class bookings.'),
    sections: [
      {
        id: 'cancel',
        heading: 'Cancelling or moving a date',
        html: `${facts([
  ['More than 7 days before', 'Full refund, or move to any other date'],
  ['2 – 7 days before', 'Move to another date, or a credit valid for 12 months'],
  ['Less than 48 hours', 'No refund; you are welcome to send someone in your place'],
])}
${pm('Tell us as early as you can. A late cancellation usually means an empty bench that somebody else wanted.')}`,
      },
      {
        id: 'us',
        heading: 'If we cancel',
        html: `${p('If we cancel a class — because a teacher is ill, or too few people booked — you choose between a full refund and a place on any other date. We will tell you as soon as we know rather than on the day if we can avoid it.')}`,
      },
      {
        id: 'allergies',
        heading: 'Allergies and dietary requirements',
        html: `${p('Tell us when you book, not when you arrive. We can work around most requirements given notice, because we buy for the class in advance.')}
${p('Our kitchen handles nuts, gluten, dairy, eggs and shellfish. We can keep your food separate and clean down, but we cannot promise a kitchen free of any of them.')}`,
      },
      {
        id: 'safety',
        heading: 'In the kitchen',
        html: `${p('You will be using sharp knives and a hot stove. Closed shoes are required; we provide aprons and everything else. Please follow the teacher’s instructions on knives and heat.')}
${p('You are welcome to take photographs in class. Ask before photographing other people.')}`,
      },
    ],
  },
]

for (const page of pages) {
  const out = writePage(root, page)
  console.log(`wrote ${page.file}`)
}
