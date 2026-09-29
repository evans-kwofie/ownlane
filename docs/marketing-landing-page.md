# Marketing landing page

This document defines the narrative, content architecture, and design direction
for Ownlane's primary marketing page. Build against this structure rather than
adding isolated sections as new features come to mind.

The page has one job: make a visitor understand why their online identity needs
a control centre, believe that Ownlane can be that control centre, and feel
confident enough to start with a name.

## Core narrative

The page makes its argument in three acts:

1. **Make the problem felt.** A person's identity is already fragmented across
   the internet and gradually drifts out of date.
2. **Explain the system.** Ownlane creates one canonical identity, connects it
   to the places where that identity appears, and keeps those versions aligned.
3. **Earn trust and convert.** Be precise about platform limitations, show how
   Ownlane scales, answer objections, and return to the name finder.

More sections are not the objective by themselves. Every section must answer a
new question in the visitor's mind. Repetition disguised as page length should
be removed.

## Page structure

### 1. Hero — the promise

**Visitor question:** What is Ownlane, and why should I care?

**Primary message:** Be the same person everywhere.

Keep the hero cinematic and emotionally direct. It should contain the primary
headline, a short explanation, and the name finder. It introduces the outcome;
it does not attempt to explain the whole product.

The current direction is sound:

- immersive creator imagery;
- a concise identity-led promise;
- `ownlane.com/name` availability as the first action;
- a restrained floating header over the image.

### 2. The fragmentation bridge

**Visitor question:** Why is maintaining an online identity difficult?

**Message direction:** One person. Twelve places introducing them differently.

This is the transition from the emotional hero to the product argument. Show
the many places an identity lives: a personal site, Instagram, LinkedIn,
GitHub, newsletters, storefronts, streaming profiles, and other public pages.

The platform treatment must not imply that every named service is currently an
automatic Ownlane integration. Frame these as places where an identity already
lives, not as a compatibility or customer-logo strip.

### 3. Identity drift demonstration

**Visitor question:** What actually goes wrong?

**Message direction:** The internet is telling different versions of your
story.

Demonstrate mismatched names, old bios, inconsistent handles, stale images, and
broken links. The visitor should be able to trigger a clear before-and-after
state rather than watch a decorative animation.

The current interactive prototype is the foundation, but the final section
needs stronger visual hierarchy, richer platform fragments, and a more
meaningful aligned state.

### 4. The canonical profile

**Visitor question:** What is the centre of the product?

**Message direction:** One place decides what's true.

This is the page's primary product reveal. Show a substantial product
composition containing the canonical display name, image, bios, links,
credentials, location, contact details, and related identity fields.

The section establishes that Ownlane is a control centre and source of truth,
not another button list or profile-page template. The UI should feel usable and
specific enough to make the product credible without becoming a dashboard
feature inventory.

### 5. How Ownlane works

**Visitor question:** How does information move from Ownlane to the rest of the
internet?

Explain the mechanism in three stages:

1. **Define your identity** — create the canonical record.
2. **Connect where it lives** — add accounts, sites, and public destinations.
3. **Keep every version current** — preview differences, make permitted
   updates, follow guided actions, and verify the result.

This section should explain the system rather than repeat benefits from the
hero. A connected visual flow is more appropriate than three unrelated cards.

### 6. A real change scenario

**Visitor question:** What does using Ownlane feel like when something changes?

Use one concrete event—a new role, a rebrand, a campaign launch, or an updated
profile image—and follow it through the product:

`Change in Ownlane → preview differences → update supported platforms → guided
actions elsewhere → verify`

This scenario is the proof between the abstract workflow and the wider feature
set. It should make the value of the product understandable in under a minute.

### 7. Capability gallery

**Visitor question:** What else can I control from here?

Present a substantial editorial product showcase covering:

- the public Ownlane site;
- identity health and mismatch detection;
- links and campaign control;
- assets and current work;
- audience and analytics.

Do not render this as a generic grid of equal feature cards. Use large product
scenes, strong pacing, and selective supporting copy. A scrolling gallery or a
sequence of alternating editorial compositions can reveal the wider system
without turning the page into documentation.

Only show capabilities at the level the product can honestly support. A future
feature may appear as product direction only when it is clearly labelled as
such; it must not be presented as an available action.

### 8. Honest platform coverage

**Visitor question:** Can Ownlane really update everything?

**Message direction:** Automatic where platforms allow it. Precise everywhere
else.

Explain the provider and field-level capability model:

- **Write:** Ownlane can make the permitted change.
- **Read:** Ownlane can compare the public value against the canonical record.
- **Guided:** Ownlane supplies the exact value, destination, and completion
  state when a direct update is unavailable.
- **Unsupported:** Ownlane says so plainly.

This is both a trust section and a product differentiator. Never use language
that implies universal automatic synchronisation; third-party APIs determine
what can be read or written.

### 9. Who it grows with

**Visitor question:** Is this only a link page for individual creators?

Show increasing scope rather than disconnected personas:

1. one person managing their public presence;
2. a founder or business managing a brand;
3. a team or agency managing multiple identities.

The individual remains the clearest entry point. Business and agency use cases
demonstrate that the same identity model grows without forcing the opening of
the page to speak to everybody at once.

### 10. Ownership and trust

**Visitor question:** What access does Ownlane have, and am I still in control?

Keep this section factual and restrained. Cover only implemented or guaranteed
principles such as OAuth connections, minimum required permissions, visibility
before changes, disconnect controls, and data export or deletion where
available.

Security language must be specific. Avoid unsupported claims, vague shield
icons, and compliance badges the product has not earned.

### 11. Frequently asked questions

**Visitor question:** What might stop me from starting?

Initial questions:

- Does Ownlane replace my website?
- Which platforms can it update automatically?
- What happens when a platform blocks profile updates?
- Can I manage multiple identities or brands?
- Do I give Ownlane my passwords?
- Can I use my existing domain?

Answers should be short, direct, and consistent with the product specification
and current release state.

### 12. Final conversion

**Visitor question:** What should I do next?

**Message direction:** Give your identity one place to live.

Return to the name finder after the visitor has seen the problem, mechanism,
product, limitations, and trust model. Reusing the same action gives the page a
clear opening and closing loop.

### 13. Footer

Use a full footer with stable destinations for Product, Company, Resources,
Legal, social accounts, and service status. Do not add dead links merely to make
the company appear larger. Until a destination exists, omit it.

## Design principles

### Pace the page like a story

Alternate immersive, explanatory, and product-dense moments. Consecutive
sections should not all use the same centred heading, paragraph, and card grid.
The page needs changes in scale and rhythm while still feeling like one system.

### Product UI is evidence

Use real interface concepts and plausible data. Avoid abstract dashboard
windows filled with decorative charts, invented customer metrics, or controls
that do not correspond to the product.

### Demonstrate instead of enumerate

Prefer a change flowing through the system, a profile becoming aligned, or a
health issue being resolved over a paragraph listing capabilities.

### Keep the visual language connected to the product

Marketing may be more expressive than the dashboard, but it must share the
same typography, colour tokens, mark, interaction quality, and fundamental UI
grammar. Signing up should not feel like changing companies.

### Motion must communicate state

Animation may show drift, propagation, comparison, or completion. It should not
run merely to keep the screen busy, and every interaction must remain complete
and understandable with reduced motion enabled.

### Mobile is a composed experience

Do not treat mobile as collapsed desktop grids. Product demonstrations,
connection flows, and editorial scenes need deliberate small-screen states and
readable interaction targets.

## Content constraints

- Lead with identity outcomes, not infrastructure or feature names.
- Use “canonical profile” only after explaining it in ordinary language.
- Do not describe every connection as a two-way sync.
- Do not imply direct writes where a provider allows only read or guided work.
- Do not use customer counts, testimonials, company logos, or performance
  metrics until they are real and attributable.
- Keep copy concrete: names, bios, images, links, credentials, and public
  profiles are stronger than phrases such as “unlock your digital presence.”
- The primary audience is an individual with a meaningful online presence.
  Teams, businesses, and agencies enter later as evidence of scale.

## Implementation sequence

Design and build the post-hero page in this order:

1. fragmentation bridge;
2. identity drift demonstration;
3. canonical profile reveal;
4. three-stage workflow;
5. real change scenario;
6. capability gallery;
7. platform coverage and trust;
8. audience, FAQ, final conversion, and footer.

Complete the core argument through the capability gallery before polishing the
lower conversion sections. This prevents the page from becoming a collection
of well-designed fragments without a coherent middle.

