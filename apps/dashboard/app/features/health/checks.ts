import { platformOrigin } from '../connections/handle-urls';
import type { HealthSignals } from './queries.server';
import {
  PASS_WEIGHT,
  SEVERITY_WEIGHT,
  type Finding,
  type HealthReport,
  type PassingCheck,
} from './schema';

/** Featured work older than this stops saying "I am active". */
const STALE_CONTENT_DAYS = 365;

const PROVIDER_LABELS: Record<string, string> = {
  github: 'GitHub',
  twitch: 'Twitch',
};

/**
 * Turns signals into findings. Pure: same input, same report, no I/O.
 *
 * A check has three outcomes, not two. It can fail, it can pass, or it can have
 * nothing to judge — no links to check for duplicates, replies still legitimately
 * in flight. A skipped check records neither, and so moves the score neither way.
 *
 * Passing means verified good, never merely "not yet failing". Anything that
 * reaches the passing list is something a person would be glad to read there, so
 * a backlog can never earn a tick just because it has not aged badly yet.
 */
export function runHealthChecks(signals: HealthSignals, now = new Date()): HealthReport {
  const findings: Finding[] = [];
  const passing: PassingCheck[] = [];

  const add = (finding: Finding) => findings.push(finding);
  const pass = (check: PassingCheck) => passing.push(check);

  checkProfile(signals, add, pass);
  checkReach(signals, add, pass);
  checkConsistency(signals, add, pass);
  checkHandles(signals, add, pass);
  checkConnections(signals, add, pass, now);
  checkLinks(signals, add, pass, now);
  checkContent(signals, add, pass, now);

  const lost = findings.reduce(
    (total, finding) => total + (finding.pending ? 0 : SEVERITY_WEIGHT[finding.severity]),
    0,
  );
  const earned = passing.length * PASS_WEIGHT;
  const score = earned + lost === 0 ? 100 : Math.round((earned / (earned + lost)) * 100);

  return {
    score,
    findings: findings.sort((a, b) => SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity]),
    passing,
    counts: {
      critical: findings.filter((f) => f.severity === 'critical' && !f.pending).length,
      warning: findings.filter((f) => f.severity === 'warning' && !f.pending).length,
      idea: findings.filter((f) => f.severity === 'idea' && !f.pending).length,
      passing: passing.length,
    },
    checkedAt: now.toISOString(),
  };
}

type Add = (finding: Finding) => void;
type Pass = (check: PassingCheck) => void;

function checkProfile(signals: HealthSignals, add: Add, pass: Pass) {
  const { profile } = signals;

  if (profile.visibility !== 'public') {
    add({
      id: 'profile-private',
      severity: 'critical',
      area: 'profile',
      title: 'Your profile is not published',
      why: 'Nobody outside this workspace can see it, so every other thing on this page is work that reaches no one.',
      evidence: `profiles.visibility = '${profile.visibility}'`,
      fix: { label: 'Publish', to: '/profile/configuration' },
    });
  } else {
    pass({ id: 'profile-private', area: 'profile', label: 'Profile is published' });
  }

  if (!profile.avatarKey) {
    add({
      id: 'profile-avatar',
      severity: 'critical',
      area: 'profile',
      title: 'No profile photo or logo',
      why: 'Platforms fall back to a default silhouette, and a shared link previews as an empty box. It is the single most visible missing field.',
      evidence: 'profiles.avatar_key IS NULL',
      fix: { label: 'Add one', to: '/profile' },
    });
  } else {
    pass({ id: 'profile-avatar', area: 'profile', label: 'Profile photo is set' });
  }

  if (!profile.shortBio) {
    add({
      id: 'profile-bio',
      severity: 'critical',
      area: 'profile',
      title: 'No bio',
      why: 'The short bio is what every connected platform copies. Without it there is nothing to sync and nothing to read.',
      evidence: 'profiles.short_bio IS NULL',
      fix: { label: 'Write one', to: '/profile' },
    });
  } else if (!profile.longBio) {
    add({
      id: 'profile-long-bio',
      severity: 'idea',
      area: 'profile',
      title: 'No long bio',
      why: 'Platforms with room for more will fall back to the short one, and your own profile page has space it is not using.',
      evidence: 'profiles.long_bio IS NULL',
      fix: { label: 'Open Profile', to: '/profile' },
    });
  } else {
    pass({ id: 'profile-bio', area: 'profile', label: 'Short and long bios are written' });
  }

  if (!profile.handle) {
    add({
      id: 'profile-handle',
      severity: 'warning',
      area: 'profile',
      title: 'No handle chosen',
      why: 'The handle is the address people are given and the name drift is measured against. Without one, nothing can be compared across platforms.',
      evidence: 'profiles.handle IS NULL',
      fix: { label: 'Choose one', to: '/profile' },
    });
  } else {
    pass({ id: 'profile-handle', area: 'profile', label: 'Handle is set' });
  }

  if (!profile.coverKey) {
    add({
      id: 'profile-cover',
      severity: 'idea',
      area: 'profile',
      title: 'No cover image',
      why: 'It is the banner across the top of your public profile, and the picture people see when your link is shared. Without one the profile opens on plain text, and shared links fall back to cropping your avatar into a small square.',
      evidence: 'profiles.cover_key IS NULL',
      fix: { label: 'Open Assets', to: '/assets' },
    });
  } else {
    pass({ id: 'profile-cover', area: 'profile', label: 'Cover image is set' });
  }

  if (!profile.profession && !profile.categories) {
    add({
      id: 'profile-what',
      severity: 'warning',
      area: 'profile',
      title: 'Nothing says what you do',
      why: 'Neither a profession nor a category is set, so your profile describes who you are but not what you are for.',
      evidence: 'profiles.profession IS NULL AND profiles.categories IS NULL',
      fix: { label: 'Open Profile', to: '/profile' },
    });
  } else {
    pass({
      id: 'profile-what',
      area: 'profile',
      label:
        profile.profession && profile.categories
          ? 'Profession and categories are set'
          : profile.profession
            ? 'Profession is set'
            : 'Categories are set',
    });
  }

  if (!profile.timezone) {
    add({
      id: 'profile-timezone',
      severity: 'idea',
      area: 'profile',
      title: 'No timezone set',
      why: 'Anyone deciding when to contact you is guessing, and booking links cannot show sensible times.',
      evidence: 'profiles.timezone IS NULL',
      fix: { label: 'Open Profile', to: '/profile' },
    });
  } else {
    pass({ id: 'profile-timezone', area: 'profile', label: 'Timezone is set' });
  }

  if (!profile.pronunciation) {
    add({
      id: 'profile-pronunciation',
      severity: 'idea',
      area: 'profile',
      title: 'No pronunciation recorded',
      why: 'Worth thirty seconds if your name is often said wrong. Skip it otherwise.',
      evidence: 'profiles.pronunciation IS NULL',
      fix: { label: 'Open Profile', to: '/profile' },
    });
  } else {
    pass({ id: 'profile-pronunciation', area: 'profile', label: 'Pronunciation is recorded' });
  }
}

function checkReach(signals: HealthSignals, add: Add, pass: Pass) {
  const { contact } = signals;

  if (!contact.publicChannels && !contact.formEnabled) {
    add({
      id: 'reach-none',
      severity: 'critical',
      area: 'reach',
      title: 'Nobody can contact you',
      why: 'No contact channel is published and the contact form is off, so a visitor who wants to reach you has no way to. Everything else on the profile is work that ends here.',
      evidence: 'profile_contact_visibility: 0 public · profile_contact_form.is_enabled = 0',
      fix: { label: 'Open Audience', to: '/audience' },
    });
  } else {
    pass({ id: 'reach-none', area: 'reach', label: 'At least one way to reach you is public' });
  }

  if (contact.notifyOwner && !contact.notifyEmail) {
    add({
      id: 'reach-notify',
      severity: 'warning',
      area: 'reach',
      title: 'Lead emails are on but have nowhere to go',
      why: 'Notifications are switched on with no address set, so every lead arrives silently. The inbox still keeps them.',
      evidence: 'profile_contact_form.notify_owner = 1 AND notify_email IS NULL',
      fix: { label: 'Open Audience', to: '/audience' },
    });
  } else if (contact.notifyOwner) {
    pass({ id: 'reach-notify', area: 'reach', label: 'Lead emails have somewhere to go' });
  }

  if (signals.leads.unansweredOverAWeek > 0) {
    const count = signals.leads.unansweredOverAWeek;
    add({
      id: 'reach-unanswered',
      severity: 'warning',
      area: 'reach',
      title: `${count} ${count === 1 ? 'lead has' : 'leads have'} gone unanswered for over a week`,
      why: 'Still marked new. A contact form collecting messages nobody replies to is worse than no form at all.',
      evidence: `leads: status = 'new' · oldest created_at = ${signals.leads.oldestUnansweredAt}`,
      fix: { label: 'Open Audience', to: '/audience' },
    });
  } else if (signals.leads.total && !signals.leads.unanswered) {
    pass({ id: 'reach-unanswered', area: 'reach', label: 'Every lead has been replied to' });
  }
  // Leads still waiting, but none for a week yet: in flight. Health neither
  // congratulates nor scolds — the count lives in Audience, where it is acted on.
}

/**
 * The heart of module 7: what each platform actually shows, against the
 * canonical record. `connected_accounts` stores the provider's own display name
 * and handle, so this needs no sync engine and no new provider calls.
 */
function checkConsistency(signals: HealthSignals, add: Add, pass: Pass) {
  const { profile, connections } = signals;
  let drifted = 0;
  let verified = 0;
  // Counted separately: a comparison only happens when both sides hold a value,
  // so claiming "name and handle match" after comparing only names is a lie.
  let namesCompared = 0;
  let handlesCompared = 0;
  const unverified: string[] = [];

  for (const account of connections) {
    const label = PROVIDER_LABELS[account.provider] ?? account.provider;

    // Only judge values that were read back from the provider. What the connect
    // flow stored is a snapshot of unknown age, and a push sync can make the
    // platform match while that snapshot still shows the old value — reporting
    // drift that Ownlane itself just removed.
    if (!account.identityCheckedAt) {
      unverified.push(label);
      continue;
    }
    verified++;

    if (profile.displayName && account.displayName) {
      namesCompared++;
    }
    if (
      profile.displayName &&
      account.displayName &&
      !equivalent(profile.displayName, account.displayName)
    ) {
      drifted++;
      add({
        id: `consistency-name-${account.provider}`,
        severity: 'warning',
        area: 'consistency',
        title: `Your name differs on ${label}`,
        why: `${label} shows “${account.displayName}” while Ownlane holds “${profile.displayName}”. Someone who finds you there sees a different identity than the one you decided on.`,
        evidence: `profiles.display_name = '${profile.displayName}' · ${label} showed '${account.displayName}' when last read (${account.identityCheckedAt})`,
        fix: { label: 'Compare', to: '/connections' },
      });
    }

    if (profile.handle && account.providerHandle) {
      handlesCompared++;
    }
    if (
      profile.handle &&
      account.providerHandle &&
      !equivalent(profile.handle, account.providerHandle)
    ) {
      drifted++;
      add({
        id: `consistency-handle-${account.provider}`,
        severity: 'warning',
        area: 'consistency',
        title: `Your handle differs on ${label}`,
        why: `Ownlane holds @${profile.handle}; ${label} reports @${account.providerHandle}. Handle drift is what breaks people searching for you by name.`,
        evidence: `profiles.handle = '${profile.handle}' · ${label} showed '${account.providerHandle}' when last read (${account.identityCheckedAt})`,
        fix: { label: 'Compare', to: '/connections' },
      });
    }
  }

  if (unverified.length) {
    add({
      id: 'consistency-unverified',
      severity: 'idea',
      area: 'consistency',
      title: `Not yet compared against ${unverified.join(' or ')}`,
      why: 'Ownlane has not read back what these platforms currently show, so it will not claim anything about them either way. It is reading them now in the background; this clears on your next visit.',
      evidence: `connected_accounts.identity_checked_at IS NULL · ${unverified.join(', ')}`,
    });
  }

  if (verified && !drifted && (namesCompared || handlesCompared)) {
    const what =
      namesCompared && handlesCompared ? 'Name and handle' : namesCompared ? 'Name' : 'Handle';
    pass({
      id: 'consistency-all',
      area: 'consistency',
      label: `${what} ${namesCompared && handlesCompared ? 'match' : 'matches'} on ${
        verified === 1 ? 'the connected platform' : `all ${verified} connected platforms`
      }`,
    });
  }
}

/**
 * Handle coverage. Deliberately not framed as impersonation: the only fact a
 * URL check establishes is that a handle resolves to something other than the
 * account you connected. Who holds it, and why, is not knowable this way, and
 * calling a stranger an impersonator on that basis would be wrong.
 */
function checkHandles(signals: HealthSignals, add: Add, pass: Pass) {
  const { handles, profile } = signals;
  if (!profile.handle || !handles.checked) return;

  if (handles.taken.length) {
    add({
      id: 'handles-taken',
      severity: 'warning',
      area: 'consistency',
      title: `@${profile.handle} belongs to someone else on ${handles.taken.length} ${handles.taken.length === 1 ? 'platform' : 'platforms'}`,
      why: `The handle resolves on ${handles.taken.map(providerLabel).join(', ')}, but not to an account you have connected. It may be nothing more than someone with a similar name — worth a look, so you know what a person searching for you finds.`,
      evidence: `handle_coverage: state = 'taken' · ${handles.taken.join(', ')}`,
      fix: { label: 'Open Connections', to: '/connections' },
    });
  }

  if (handles.available.length) {
    add({
      id: 'handles-available',
      severity: 'idea',
      area: 'consistency',
      title: `@${profile.handle} is still free on ${handles.available.length} ${handles.available.length === 1 ? 'platform' : 'platforms'}`,
      why: `Unclaimed on ${handles.available.map(providerLabel).join(', ')}. Registering a handle you are not using yet costs nothing and stops somebody else holding your name.`,
      evidence: `handle_coverage: state = 'available' · ${handles.available.join(', ')}`,
      // Straight to each platform, because claiming happens there and not here.
      links: handles.available.flatMap((provider) => {
        const href = platformOrigin(provider);
        return href ? [{ label: providerLabel(provider), href }] : [];
      }),
    });
  }

  if (!handles.taken.length && !handles.available.length) {
    pass({
      id: 'handles-coverage',
      area: 'consistency',
      label: `@${profile.handle} is yours everywhere it could be checked`,
    });
  }
}

function providerLabel(provider: string) {
  return PROVIDER_LABELS[provider] ?? provider.charAt(0).toUpperCase() + provider.slice(1);
}

function checkConnections(signals: HealthSignals, add: Add, pass: Pass, now: Date) {
  const { connections } = signals;

  if (!connections.length) {
    add({
      id: 'connections-none',
      severity: 'warning',
      area: 'connections',
      title: 'No platforms connected',
      why: 'Ownlane can hold your identity but cannot keep anything else current, and nothing can be checked for drift.',
      evidence: 'connected_accounts: 0 rows',
      fix: { label: 'Connect one', to: '/connections/new' },
    });
    return;
  }

  let healthy = 0;

  for (const account of connections) {
    const label = PROVIDER_LABELS[account.provider] ?? account.provider;

    // The clock decides, not the stored verdict. `token_health` is written at
    // connect time and on a successful sync, so an expired credential can sit
    // there reading 'healthy' indefinitely — which is how this page once said a
    // token that lapsed yesterday "expires in 0 days".
    const expiredDays = daysSince(account.tokenExpiresAt, now);
    const hasLapsed =
      account.tokenHealth === 'expired' ||
      account.tokenHealth === 'missing' ||
      (expiredDays !== null && expiredDays >= 0);

    if (hasLapsed) {
      add({
        id: `connections-expired-${account.provider}`,
        severity: 'critical',
        area: 'connections',
        title: `${label} needs reconnecting`,
        why: 'Ownlane renews credentials automatically, but this one could not be renewed — usually because access was revoked on the provider. Reconnecting is the only way back.',
        evidence: `connected_accounts: provider = '${account.provider}' · token_health = '${account.tokenHealth}'${account.tokenExpiresAt ? ` · expired ${describeAge(account.tokenExpiresAt, now)}` : ''}`,
        fix: { label: 'Reconnect', to: '/connections' },
      });
      continue;
    }

    if (account.lastErrorCode) {
      add({
        id: `connections-error-${account.provider}`,
        severity: 'warning',
        area: 'connections',
        title: `${label} reported an error`,
        why: 'The last operation against this account failed. It may still be connected, but it is not doing what you expect.',
        evidence: `connected_accounts.last_error_code = '${account.lastErrorCode}'${account.updatedAt ? ` · recorded ${describeAge(account.updatedAt, now)}` : ''}`,
        fix: { label: 'Open Connections', to: '/connections' },
      });
      continue;
    }

    healthy++;
  }

  if (healthy) {
    pass({
      id: 'connections-healthy',
      area: 'connections',
      label: `${healthy} ${healthy === 1 ? 'connection has' : 'connections have'} valid credentials`,
    });
  }
}

function checkLinks(signals: HealthSignals, add: Add, pass: Pass, now: Date) {
  const { links } = signals;

  if (!links.total) {
    add({
      id: 'links-none',
      severity: 'warning',
      area: 'links',
      title: 'No links yet',
      why: 'The profile describes you but points nowhere. Links are what a visitor is there to follow.',
      evidence: 'profile_links: 0 rows',
      fix: { label: 'Add a link', to: '/links/new' },
    });
  } else {
    pass({ id: 'links-none', area: 'links', label: `${links.total} links in place` });
  }

  if (links.expired.length) {
    const first = links.expired[0];
    const more = links.expired.length - 1;
    add({
      id: 'links-expired',
      severity: 'warning',
      area: 'links',
      title:
        links.expired.length === 1
          ? 'One link has passed its end date'
          : `${links.expired.length} links have passed their end date`,
      why: `“${first.label}” ended ${describeAge(first.endsAt, now)}${more ? `, and ${more} other${more === 1 ? '' : 's'} too` : ''}. They are hidden from the public page but still occupy slots in your ordering.`,
      evidence: `profile_links: ends_at < now · ${links.expired.map((l) => l.label).join(', ')}`,
      fix: { label: 'Open Links', to: '/links' },
    });
  } else if (links.total) {
    pass({ id: 'links-expired', area: 'links', label: 'No expired links left listed' });
  }

  if (links.duplicateUrls) {
    add({
      id: 'links-duplicate',
      severity: 'idea',
      area: 'links',
      title: 'Some links point at the same place',
      why: 'Duplicate destinations split their own click counts, so neither looks as popular as the pair really is.',
      evidence: `profile_links: ${links.duplicateUrls} duplicated url${links.duplicateUrls === 1 ? '' : 's'}`,
      fix: { label: 'Open Links', to: '/links' },
    });
  } else if (links.total > 1) {
    // One link cannot duplicate anything, so there is nothing to have passed.
    pass({ id: 'links-duplicate', area: 'links', label: 'No duplicate link destinations' });
  }

  // Only meaningful once something is being clicked at all; otherwise this
  // fires on every link of a brand-new profile and says nothing.
  if (links.active && links.withoutClicks.length && links.withoutClicks.length < links.active) {
    add({
      id: 'links-quiet',
      severity: 'idea',
      area: 'links',
      title: `${links.withoutClicks.length} ${links.withoutClicks.length === 1 ? 'link has' : 'links have'} had no clicks in 30 days`,
      why: `${links.withoutClicks.map((l) => `“${l}”`).join(', ')} went unopened. Either they are in the wrong position or they have stopped being relevant.`,
      evidence: 'analytics_events: 0 outbound_click in the last 30 days',
      fix: { label: 'Open Links', to: '/links' },
    });
  }

  if (links.broken.length) {
    const first = links.broken[0];
    const more = links.broken.length - 1;
    add({
      id: 'links-broken',
      severity: 'critical',
      area: 'links',
      title:
        links.broken.length === 1 ? 'A link is broken' : `${links.broken.length} links are broken`,
      why: `“${first.label}” has failed every check for days${more ? `, along with ${more} other${more === 1 ? '' : 's'}` : ''}. Anyone following it lands on an error, which reads worse than having no link at all.`,
      evidence: links.broken.map((link) => `${link.label} → ${link.reason}`).join(' · '),
      fix: { label: 'Open Links', to: '/links' },
    });
  }

  if (links.redirected.length) {
    const first = links.redirected[0];
    add({
      id: 'links-redirected',
      severity: 'idea',
      area: 'links',
      title:
        links.redirected.length === 1
          ? 'A link has permanently moved'
          : `${links.redirected.length} links have permanently moved`,
      why: `“${first.label}” still works, but it now redirects. Pointing straight at the new address is faster and survives the redirect being turned off.`,
      evidence: links.redirected.map((link) => `${link.label} → ${link.to}`).join(' · '),
      fix: { label: 'Open Links', to: '/links' },
    });
  }

  // Only claim links work once they have actually been probed. Anything not yet
  // checked is neither a pass nor a failure.
  if (links.active && !links.unchecked && !links.broken.length && !links.redirected.length) {
    pass({ id: 'links-reachable', area: 'links', label: 'Every link resolves' });
  }
}

function checkContent(signals: HealthSignals, add: Add, pass: Pass, now: Date) {
  const { content } = signals;

  if (!content.featured) {
    add({
      id: 'content-none',
      severity: 'idea',
      area: 'content',
      title: 'No featured work',
      why: 'The profile says who you are but shows nothing you have made.',
      evidence: 'content_items: is_featured = 1 → 0 rows',
      fix: { label: 'Open Content', to: '/content' },
    });
    return;
  }

  const age = daysSince(content.newestFeaturedAt, now);
  if (age === null) {
    // Featured items exist but carry no publish date, so their age is unknown.
    // Nothing to judge either way.
    return;
  }
  if (age > STALE_CONTENT_DAYS) {
    add({
      id: 'content-stale',
      severity: 'warning',
      area: 'content',
      title: 'Featured work is over a year old',
      why:
        'Your newest featured item is from ' +
        describeAge(content.newestFeaturedAt!, now) +
        '. Featured work is the part of a profile that says you are still active.',
      evidence: `content_items: is_featured = 1 · max(published_at) = ${content.newestFeaturedAt}`,
      fix: { label: 'Open Content', to: '/content' },
    });
  } else {
    pass({ id: 'content-stale', area: 'content', label: 'Featured work is current' });
  }
}

/** Names match if they differ only by case, spacing or punctuation. */
function equivalent(a: string, b: string) {
  const normalise = (value: string) => value.toLowerCase().replace(/[\s._-]/g, '');
  return normalise(a) === normalise(b);
}

function parseDate(value: string | null) {
  if (!value) return null;
  // D1 writes CURRENT_TIMESTAMP without a zone marker; ISO values carry one.
  const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysSince(value: string | null, now: Date) {
  const date = parseDate(value);
  if (!date) return null;
  return Math.floor((now.getTime() - date.getTime()) / 86_400_000);
}

function describeAge(value: string, now: Date) {
  const days = daysSince(value, now);
  if (days === null) return 'a while ago';
  if (days <= 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.round(days / 30)} months ago`;
  return `${Math.floor(days / 365)} year${days >= 730 ? 's' : ''} ago`;
}
