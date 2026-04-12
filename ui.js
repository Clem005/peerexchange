/**
 * ui.js — Pure render layer
 * Reads state from App, renders HTML strings, binds events
 */

const UI = (function () {

  /* ─────────────────────────────────────────
     SVG ICONS
  ───────────────────────────────────────── */
  const Icons = {
    check: `<path d="M4 8.5L7 11.5L12 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>`,
    scissors: `<path d="M6 6a2 2 0 1 1-2-2M6 6l4 4M6 6l4-4M10 10a2 2 0 1 1 2 2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>`,
    clock: `<circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1.2"/><path d="M8 5.5v3l2 1.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>`,
    swap: `<path d="M1 4.5h9M8 2l3 2.5L8 7M15 11.5H6M8 9l-3 2.5L8 14" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`,
    calendar: `<rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" stroke-width="1.1"/><path d="M2 7h12M6 2v2M10 2v2" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>`,
    board: `<path d="M2 4.5h12M2 8.5h12M2 12.5h7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>`,
    history: `<circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1.2"/><path d="M8 5.5v3l2 1.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>`,
    info: `<circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.1"/><path d="M8 7v4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><circle cx="8" cy="5.5" r="0.75" fill="currentColor"/>`,
    alert: `<circle cx="8" cy="8" r="6.5" stroke="#f59e0b" stroke-width="1.1"/><path d="M8 5v3.5" stroke="#f59e0b" stroke-width="1.2" stroke-linecap="round"/><circle cx="8" cy="11.2" r="0.8" fill="#f59e0b"/>`,
    arrow_up: `<path d="M6 9L3 6l3-3M3 6h8a3 3 0 0 1 0 6H9" stroke="#f87171" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`,
    arrow_dn: `<path d="M6 3L3 6l3 3M3 6h8a3 3 0 0 1 0 6H9" stroke="#4ade80" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`,
    arrow_eq: `<path d="M2 6h12M2 10h12" stroke="#555" stroke-width="1.2" stroke-linecap="round"/>`,
    phone: `<rect x="4" y="1" width="8" height="14" rx="2" stroke="currentColor" stroke-width="1.2"/><circle cx="8" cy="12" r="0.8" fill="currentColor"/>`,
    logout: `<path d="M10 11l3-3-3-3M13 8H6M6 3H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`,
    plus: `<path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>`,
    trash: `<path d="M3 5h10M5 5V3h6v2M6 8v5M10 8v5M4 5l1 8h6l1-8" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>`,
  };

  function icon(name, size = 16, color = 'currentColor') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" style="color:${color};flex-shrink:0">${Icons[name] || ''}</svg>`;
  }

  /* ─────────────────────────────────────────
     SHARED COMPONENTS
  ───────────────────────────────────────── */
  function avatar(label, size = 28) {
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#0d1c30;border:1px solid #1a3355;color:#60a5fa;font-size:${Math.floor(size*0.35)}px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">${label}</div>`;
  }

  function pill(text, color = 'green') {
    const map = {
      green:  'background:#0b1c0b;border:1px solid #39ff6e2a;color:#39ff6e',
      amber:  'background:#1d1300;border:1px solid #f59e0b2a;color:#f59e0b',
      blue:   'background:#0d1622;border:1px solid #2563eb33;color:#60a5fa',
      gray:   'background:#181818;border:1px solid #282828;color:#555',
    };
    return `<span style="display:inline-flex;align-items:center;font-size:12px;font-weight:700;padding:4px 11px;border-radius:20px;${map[color]||map.gray}">${text}</span>`;
  }

  function statusBadge(offering) {
    const cls = offering ? 'sb-listed' : 'sb-confirmed';
    const dot = offering ? '#f59e0b' : '#39ff6e';
    const txt = offering ? 'Listed — seeking swap' : 'Confirmed';
    return `<div class="sbadge ${cls}"><span class="sdot" style="background:${dot}"></span>${txt}</div>`;
  }

  function diffChip(type, label) {
    const map = { up: 'dc-up', dn: 'dc-dn', eq: 'dc-eq' };
    const ico = { up: 'arrow_up', dn: 'arrow_dn', eq: 'arrow_eq' };
    return `<div class="dchip ${map[type]}">${icon(ico[type], 12)} ${label}</div>`;
  }

  /* ─────────────────────────────────────────
     AUTH SCREEN
  ───────────────────────────────────────── */
  function renderAuth(s) {
    const step = s.authStep;

    const steps = [
      { id: 'phone', label: 'Phone'  },
      { id: 'otp',   label: 'Verify' },
      { id: 'name',  label: 'Name'   },
    ];
    const stepIdx = steps.findIndex(x => x.id === step);

    const progress = steps.map((st, i) => {
      const done    = i < stepIdx;
      const current = i === stepIdx;
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1">
        <div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;
          ${done    ? 'background:#0b1c0b;color:#39ff6e;border:1px solid #39ff6e33' :
            current ? 'background:#2563eb;color:#fff;border:none' :
                      'background:#181818;color:#333;border:1px solid #222'}">
          ${done ? icon('check', 12, '#39ff6e') : i + 1}
        </div>
        <span style="font-size:10px;font-weight:600;color:${current ? '#fff' : done ? '#39ff6e' : '#333'}">${st.label}</span>
      </div>`;
    }).join(`<div style="flex:1;height:1px;background:#1e1e1e;margin-top:14px;max-width:40px"></div>`);

    let form = '';

    if (step === 'phone') {
      form = `
        <div class="auth-group">
          <label class="auth-label">Phone number</label>
          <div class="auth-input-wrap">
            <span class="auth-prefix">+27</span>
            <input id="inp-phone" class="auth-input" type="tel" maxlength="13"
              placeholder="082 123 4567"
              value="${s.authPhone ? App.formatPhone(s.authPhone) : ''}"
              inputmode="numeric" autocomplete="tel"/>
          </div>
          ${s.authError ? `<div class="auth-err">${icon('info', 13)} ${s.authError}</div>` : ''}
          <div class="auth-hint">We'll send a one-time code to verify your number</div>
        </div>
        <button class="btn btn-blue btn-full" id="b-phone-submit">Send code</button>
        <div style="margin-top:18px;text-align:center">
          <div style="font-size:11px;color:#333;margin-bottom:10px">Demo accounts (tap to fill)</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center">
            ${Object.values(KNOWN_USERS_PUBLIC()).map(u =>
              `<button class="demo-pill" data-phone="${u.phone}">${u.name}</button>`
            ).join('')}
            <button class="demo-pill" data-phone="0799999999">New user</button>
          </div>
        </div>`;
    }

    if (step === 'otp') {
      form = `
        <div class="auth-group">
          <label class="auth-label">Verification code</label>
          <div style="font-size:12px;color:#555;margin-bottom:12px">Sent to ${App.formatPhone(s.authPhone)}</div>
          <div class="otp-grid" id="otp-grid">
            ${[0,1,2,3].map(i => `<input class="otp-box" id="otp-${i}" maxlength="1" inputmode="numeric" type="tel">`).join('')}
          </div>
          ${s.authError ? `<div class="auth-err">${icon('info', 13)} ${s.authError}</div>` : ''}
          <div class="auth-hint">Hint: the code is <strong style="color:#60a5fa">1234</strong></div>
        </div>
        <button class="btn btn-blue btn-full" id="b-otp-submit">Verify</button>
        <button class="btn btn-ghost btn-full" id="b-otp-back" style="margin-top:8px">← Change number</button>`;
    }

    if (step === 'name') {
      form = `
        <div class="auth-group">
          <label class="auth-label">Your name</label>
          <input id="inp-name" class="auth-input" type="text" placeholder="e.g. Tshepo M."
            autocomplete="name" style="padding-left:14px"/>
          ${s.authError ? `<div class="auth-err">${icon('info', 13)} ${s.authError}</div>` : ''}
          <div class="auth-hint">This shows on the swap board when you list a slot</div>
        </div>
        <button class="btn btn-blue btn-full" id="b-name-submit">Continue</button>
        <button class="btn btn-ghost btn-full" id="b-name-back" style="margin-top:8px">← Back</button>`;
    }

    return `
      <div style="padding:36px 20px 32px;display:flex;flex-direction:column;min-height:580px">
        <div style="text-align:center;margin-bottom:32px">
          <div style="width:52px;height:52px;border-radius:16px;background:#1a1a1a;border:1px solid #2a2a2a;display:flex;align-items:center;justify-content:center;margin:0 auto 14px">
            ${icon('scissors', 24, '#60a5fa')}
          </div>
          <div style="font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.4px">Campus Cuts</div>
          <div style="font-size:12px;color:#444;margin-top:4px">Peer-to-peer slot exchange</div>
        </div>

        <div style="display:flex;align-items:center;justify-content:center;gap:0;margin-bottom:32px">
          ${progress}
        </div>

        ${form}
      </div>`;
  }

  /* ─────────────────────────────────────────
     BOARD SCREEN
  ───────────────────────────────────────── */
  function renderBoard(s) {
    let h = '';

    // Top bar
    h += `
      <div class="topbar">
        <div>
          <div class="topbar-title">Swapping Board</div>
          <div class="topbar-sub">Trade directly — both calendars auto-update</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="live-pill"><span class="ldot"></span>${s.marketSwaps.length + (s.mySlot ? 1 : 0)} online</div>
          <button class="icon-btn" id="b-logout" title="Sign out">${icon('logout', 14, '#444')}</button>
        </div>
      </div>`;

    // My slot card or empty CTA
    if (s.mySlot) {
      const slot = s.mySlot;
      h += `
        <div class="my-card">
          <div class="card-top">
            <div>
              <div class="ctag">My slot</div>
              <div class="csvc">${slot.service}</div>
              <div class="cmeta">${slot.date} &middot; ${slot.time}</div>
            </div>
            ${pill(slot.price, 'green')}
          </div>
          ${statusBadge(s.offering)}
          <div class="divider"></div>
          <div class="btn-row">
            ${!s.offering
              ? `<button class="btn btn-blue" id="b-offer" style="flex:1">Offer for swap</button>`
              : `<button class="btn btn-danger" id="b-with" style="flex:1">Withdraw offer</button>`}
            <button class="btn btn-ghost icon-only" id="b-cancel-slot" title="Cancel booking">${icon('trash', 14, '#555')}</button>
          </div>
          ${s.nudge ? `
            <div class="nudge">
              ${icon('alert', 14)}
              <div class="nudge-txt">Offer your slot first to unlock claiming from the board.</div>
            </div>` : ''}
        </div>`;
    } else {
      h += `
        <div class="my-card" style="border-style:dashed;text-align:center;padding:24px 20px">
          <div style="width:40px;height:40px;border-radius:50%;background:#1a1a1a;border:1px solid #242424;display:flex;align-items:center;justify-content:center;margin:0 auto 12px">
            ${icon('calendar', 18, '#333')}
          </div>
          <div style="font-size:14px;font-weight:600;color:#444;margin-bottom:4px">No booking yet</div>
          <div style="font-size:12px;color:#2e2e2e;margin-bottom:16px">Book a slot to get started</div>
          <button class="btn btn-blue" id="b-go-book" style="width:auto;padding:10px 24px;margin:0 auto;display:inline-flex;align-items:center;gap:6px">
            ${icon('plus', 14)} Book a slot
          </button>
        </div>`;
    }

    // Available swaps
    h += `
      <div class="sec-hdr">
        <span class="sec-lbl">Available swaps</span>
        <span class="cnt-badge">${s.marketSwaps.length}</span>
      </div>`;

    if (!s.marketSwaps.length) {
      h += `<div class="empty">
        <div class="empty-ic">${icon('swap', 14, '#2a2a2a')}</div>
        <div class="empty-t">Board is empty</div>
        <div class="empty-s">No slots listed right now</div>
      </div>`;
    } else {
      s.marketSwaps.forEach(swap => {
        const d      = s.mySlot ? App.priceDiff(s.mySlot.n, swap.n) : { label: swap.price, cls: 'dc-eq', icon: 'eq' };
        const locked = !s.offering || !s.mySlot;
        h += `
          <div class="scard">
            <div class="scard-top">
              <div class="urow">
                ${avatar(swap.avatar || App.initials(swap.user), 24)}
                <span class="uname">${swap.user}</span>
              </div>
              ${pill(swap.price, 'blue')}
            </div>
            <div class="ssvc">${swap.service}</div>
            <div class="sdt">${swap.date} &middot; ${swap.time}</div>
            ${s.mySlot ? diffChip(d.icon, d.label) : ''}
            <button class="btn ${locked ? 'btn-lock' : 'btn-blue'} btn-full"
              data-swap-id="${swap.id}" ${locked ? 'disabled' : ''} style="margin-top:11px">
              ${!s.mySlot ? 'Book a slot to swap' : locked ? 'Offer your slot to unlock' : 'Claim &amp; Swap'}
            </button>
          </div>`;
      });
    }

    return h;
  }

  /* ─────────────────────────────────────────
     BOOKING SCREEN
  ───────────────────────────────────────── */
  function renderBook(s) {
    const b = s.booking;
    let h = '';

    h += `
      <div class="topbar">
        <div>
          <div class="topbar-title">Book a Slot</div>
          <div class="topbar-sub">Pick your service, day and time</div>
        </div>
        <button class="icon-btn" id="b-book-back">${icon('logout', 14, '#444')}</button>
      </div>`;

    // Step 1 — Service
    h += `<div class="book-section">
      <div class="book-step-label">
        <span class="step-num ${b.selectedService ? 'done' : 'active'}">
          ${b.selectedService ? icon('check', 10, '#39ff6e') : '1'}
        </span>
        Choose service
      </div>
      <div class="service-grid">
        ${App.SERVICES.map(svc => {
          const sel = b.selectedService?.id === svc.id;
          return `<button class="svc-card ${sel ? 'svc-sel' : ''}" data-svc="${svc.id}">
            <div class="svc-name">${svc.name}</div>
            <div class="svc-meta">R${svc.price} &middot; ${svc.duration}min</div>
          </button>`;
        }).join('')}
      </div>
    </div>`;

    // Step 2 — Day (only if service picked)
    if (b.selectedService) {
      h += `<div class="book-section">
        <div class="book-step-label">
          <span class="step-num ${b.selectedDay ? 'done' : 'active'}">
            ${b.selectedDay ? icon('check', 10, '#39ff6e') : '2'}
          </span>
          Choose day
        </div>
        <div class="day-row">
          ${App.DAYS.map(day => {
            const sel = b.selectedDay === day;
            return `<button class="day-btn ${sel ? 'day-sel' : ''}" data-day="${day}">${day}</button>`;
          }).join('')}
        </div>
      </div>`;
    }

    // Step 3 — Time (only if day picked)
    if (b.selectedDay) {
      h += `<div class="book-section">
        <div class="book-step-label">
          <span class="step-num ${b.selectedTime ? 'done' : 'active'}">
            ${b.selectedTime ? icon('check', 10, '#39ff6e') : '3'}
          </span>
          Choose time
        </div>
        <div class="time-grid">
          ${App.TIME_SLOTS.map(t => {
            const sel  = b.selectedTime === t;
            // Randomly mark a few as taken
            const hash = t.charCodeAt(0) + t.charCodeAt(1);
            const taken = hash % 5 === 0;
            return `<button class="time-btn ${sel ? 'time-sel' : ''} ${taken ? 'time-taken' : ''}"
              data-time="${t}" ${taken ? 'disabled' : ''}>${t}</button>`;
          }).join('')}
        </div>
      </div>`;
    }

    // CTA
    if (b.selectedService && b.selectedDay && b.selectedTime) {
      h += `
        <div style="margin-top:8px;background:#181818;border:1px solid #222;border-radius:14px;padding:14px 16px;margin-bottom:16px">
          <div style="font-size:11px;color:#444;font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px">Summary</div>
          <div style="font-size:15px;font-weight:700;color:#f0f0f0">${b.selectedService.name}</div>
          <div style="font-size:13px;color:#555;margin-top:3px">${b.selectedDay} &middot; ${b.selectedTime}</div>
          <div style="margin-top:8px;display:flex;gap:8px">
            ${pill(`R${b.selectedService.price}`, 'green')}
            ${pill(`${b.selectedService.duration} min`, 'gray')}
          </div>
        </div>
        <button class="btn btn-blue btn-full" id="b-book-confirm">Confirm booking</button>`;
    }

    return h;
  }

  /* ─────────────────────────────────────────
     HISTORY SCREEN
  ───────────────────────────────────────── */
  function renderHistory(s) {
    let h = `
      <div class="topbar">
        <div>
          <div class="topbar-title">Swap History</div>
          <div class="topbar-sub">Your completed exchanges</div>
        </div>
      </div>`;

    if (!s.swapHistory.length) {
      h += `<div class="empty" style="margin-top:48px">
        <div class="empty-ic">${icon('history', 14, '#2a2a2a')}</div>
        <div class="empty-t">No swaps yet</div>
        <div class="empty-s">Complete a swap to see it here</div>
      </div>`;
    } else {
      s.swapHistory.forEach(x => {
        h += `
          <div class="hist-item">
            <div class="hist-ic">${icon('swap', 14, '#39ff6e')}</div>
            <div style="min-width:0">
              <div class="hist-svc">${x.got.service}</div>
              <div class="hist-meta">${x.gave.date} ${x.gave.time} → ${x.got.date} ${x.got.time}</div>
              <div class="hist-with">with ${x.with}</div>
            </div>
            <div class="hist-right">
              ${pill(x.got.price, 'green')}
              <div class="hist-date">${x.when}</div>
            </div>
          </div>`;
      });
    }

    return h;
  }

  /* ─────────────────────────────────────────
     MODALS
  ───────────────────────────────────────── */
  function renderModal(s) {
    if (!s.modal) return '';

    let inner = '';

    if (s.modal === 'swap-confirm' && s.pendingSwap) {
      const sw = s.pendingSwap;
      const my = s.mySlot;
      inner = `
        <div class="modal-handle"></div>
        <div class="modal-title">Confirm swap</div>
        <div class="modal-sub">Review carefully — this cannot be undone</div>
        <div class="mprev">
          <div class="mrow">
            <span class="mlbl">Giving</span>
            <span class="mval m-old">${my.service}<br>${my.date} &middot; ${my.time} &middot; ${my.price}</span>
          </div>
          <div class="mrow">
            <span class="mlbl">Getting</span>
            <span class="mval m-new">${sw.service}<br>${sw.date} &middot; ${sw.time} &middot; ${sw.price}</span>
          </div>
          <div class="mrow">
            <span class="mlbl">With</span>
            <span class="mval m-with">${sw.user}</span>
          </div>
        </div>
        <div class="modal-btns">
          <button class="modal-cancel" id="m-cancel">Cancel</button>
          <button class="modal-confirm" id="m-confirm">Lock in swap</button>
        </div>`;
    }

    if (s.modal === 'book-confirm') {
      const b = s.booking;
      inner = `
        <div class="modal-handle"></div>
        <div class="modal-title">Confirm booking</div>
        <div class="modal-sub">Your slot will be reserved immediately</div>
        <div class="mprev">
          <div class="mrow"><span class="mlbl">Service</span><span class="mval m-new">${b.selectedService.name}</span></div>
          <div class="mrow"><span class="mlbl">When</span><span class="mval" style="color:#e0e0e0">${b.selectedDay} &middot; ${b.selectedTime}</span></div>
          <div class="mrow"><span class="mlbl">Price</span><span class="mval m-new">R${b.selectedService.price}</span></div>
          <div class="mrow"><span class="mlbl">Duration</span><span class="mval" style="color:#555">${b.selectedService.duration} min</span></div>
        </div>
        <div class="modal-btns">
          <button class="modal-cancel" id="m-cancel">Cancel</button>
          <button class="modal-confirm" id="m-confirm">Book it</button>
        </div>`;
    }

    if (s.modal === 'cancel-confirm') {
      inner = `
        <div class="modal-handle"></div>
        <div class="modal-title">Cancel booking?</div>
        <div class="modal-sub" style="margin-bottom:20px">Your slot will be released and cannot be recovered.</div>
        <div class="modal-btns">
          <button class="modal-cancel" id="m-cancel">Keep it</button>
          <button class="modal-confirm" style="background:#b91c1c" id="m-confirm">Yes, cancel</button>
        </div>`;
    }

    return `<div class="modal-overlay" id="modal-ov">
      <div class="modal">${inner}</div>
    </div>`;
  }

  /* ─────────────────────────────────────────
     TOAST
  ───────────────────────────────────────── */
  function renderToast(s) {
    if (!s.toast) return '';
    return `<div class="toast">
      <div style="width:32px;height:32px;border-radius:50%;background:#071510;border:1px solid #39ff6e33;display:flex;align-items:center;justify-content:center;flex-shrink:0">
        ${icon('check', 14, '#39ff6e')}
      </div>
      <div>
        <div class="toast-title">${s.toast.title}</div>
        <div class="toast-sub">${s.toast.sub}</div>
      </div>
    </div>`;
  }

  /* ─────────────────────────────────────────
     BOTTOM NAV
  ───────────────────────────────────────── */
  function renderNav(s) {
    if (s.screen === 'auth') return '';

    const tabs = [
      { id: 'board',   label: 'Board',   ico: 'board'   },
      { id: 'book',    label: 'Book',    ico: 'calendar' },
      { id: 'history', label: 'History', ico: 'history'  },
    ];

    return tabs.map(t => {
      const active  = s.tab === t.id || (s.screen === t.id);
      const color   = active ? '#2563eb' : '#2e2e2e';
      const isBook  = t.id === 'book';
      return `<button class="nav-btn ${isBook ? 'nav-book-btn' : ''}" data-tab="${t.id}">
        ${isBook
          ? `<div style="width:36px;height:36px;border-radius:50%;background:${active?'#1d4ed8':'#1a2a4a'};border:1px solid ${active?'#3b82f6':'#1e3a5f'};display:flex;align-items:center;justify-content:center;margin-bottom:2px">
               ${icon(t.ico, 16, active ? '#fff' : '#3b82f6')}
             </div>`
          : icon(t.ico, 20, color)}
        <span class="nav-label" style="color:${color}">${t.label}</span>
      </button>`;
    }).join('');
  }

  /* ─────────────────────────────────────────
     MAIN RENDER
  ───────────────────────────────────────── */
  function render(s, screenEl, navEl) {
    let content = '';

    if (s.screen === 'auth') {
      content = renderAuth(s);
    } else if (s.screen === 'board') {
      content = renderBoard(s);
    } else if (s.screen === 'book') {
      content = renderBook(s);
    } else if (s.screen === 'history') {
      content = renderHistory(s);
    }

    screenEl.innerHTML = content + renderModal(s) + renderToast(s);
    navEl.innerHTML    = renderNav(s);
    bindEvents(s, screenEl, navEl);
  }

  /* ─────────────────────────────────────────
     EVENT BINDING
  ───────────────────────────────────────── */
  function bindEvents(s, screenEl, navEl) {

    // ── Auth ──
    const phoneInp = document.getElementById('inp-phone');
    if (phoneInp) {
      phoneInp.addEventListener('input', e => {
        e.target.value = App.formatPhone(e.target.value);
      });
      phoneInp.addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('b-phone-submit')?.click();
      });
    }

    document.getElementById('b-phone-submit')?.addEventListener('click', () => {
      App.submitPhone(document.getElementById('inp-phone')?.value || '');
    });

    // OTP input — auto advance
    const otpBoxes = document.querySelectorAll('.otp-box');
    otpBoxes.forEach((box, i) => {
      box.addEventListener('input', e => {
        const v = e.target.value.replace(/\D/g,'');
        e.target.value = v.slice(0,1);
        if (v && i < 3) otpBoxes[i+1]?.focus();
        if (i === 3 && v) {
          const code = [...otpBoxes].map(b => b.value).join('');
          if (code.length === 4) App.submitOTP(code);
        }
      });
      box.addEventListener('keydown', e => {
        if (e.key === 'Backspace' && !e.target.value && i > 0) otpBoxes[i-1]?.focus();
      });
    });
    if (otpBoxes.length) otpBoxes[0].focus();

    document.getElementById('b-otp-submit')?.addEventListener('click', () => {
      const code = [...document.querySelectorAll('.otp-box')].map(b => b.value).join('');
      App.submitOTP(code);
    });
    document.getElementById('b-otp-back')?.addEventListener('click', () => App.setAuthStep('phone'));

    const nameInp = document.getElementById('inp-name');
    nameInp?.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('b-name-submit')?.click();
    });
    document.getElementById('b-name-submit')?.addEventListener('click', () => {
      App.submitName(document.getElementById('inp-name')?.value || '');
    });
    document.getElementById('b-name-back')?.addEventListener('click', () => App.setAuthStep('otp'));

    // Demo pills
    document.querySelectorAll('.demo-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const phone = btn.dataset.phone;
        const inp   = document.getElementById('inp-phone');
        if (inp) inp.value = App.formatPhone(phone);
        App.submitPhone(phone);
      });
    });

    // ── Board ──
    document.getElementById('b-offer')?.addEventListener('click', App.offerSlot);
    document.getElementById('b-with')?.addEventListener('click', App.withdrawOffer);
    document.getElementById('b-logout')?.addEventListener('click', App.logout);
    document.getElementById('b-cancel-slot')?.addEventListener('click', App.cancelBooking);
    document.getElementById('b-go-book')?.addEventListener('click', () => App.navigateTo('book'));

    screenEl.querySelectorAll('[data-swap-id]').forEach(btn => {
      btn.addEventListener('click', () => App.initiateClaim(btn.dataset.swapId));
    });

    // ── Booking ──
    document.getElementById('b-book-back')?.addEventListener('click', () => App.navigateTo('board'));
    document.getElementById('b-book-confirm')?.addEventListener('click', App.openBookConfirm);

    screenEl.querySelectorAll('[data-svc]').forEach(btn => {
      btn.addEventListener('click', () => App.setBookingService(btn.dataset.svc));
    });
    screenEl.querySelectorAll('[data-day]').forEach(btn => {
      btn.addEventListener('click', () => App.setBookingDay(btn.dataset.day));
    });
    screenEl.querySelectorAll('[data-time]').forEach(btn => {
      btn.addEventListener('click', () => App.setBookingTime(btn.dataset.time));
    });

    // ── Modal ──
    document.getElementById('m-cancel')?.addEventListener('click', App.closeModal);
    document.getElementById('m-confirm')?.addEventListener('click', () => {
      if (s.modal === 'swap-confirm')   App.confirmSwap();
      if (s.modal === 'book-confirm')   App.confirmBooking();
      if (s.modal === 'cancel-confirm') App.confirmCancelBooking();
    });
    document.getElementById('modal-ov')?.addEventListener('click', e => {
      if (e.target.id === 'modal-ov') App.closeModal();
    });

    // ── Nav ──
    navEl.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = btn.dataset.tab;
        App.setTab(t);
        App.navigateTo(t);
      });
    });
  }

  // Small helper to expose KNOWN_USERS for auth screen demo pills
  function KNOWN_USERS_PUBLIC() {
    return {
      '0821234567': { name: 'Thabo M.',  phone: '0821234567' },
      '0831234567': { name: 'Sipho K.',  phone: '0831234567' },
      '0841234567': { name: 'Luca N.',   phone: '0841234567' },
    };
  }

  return { render };
})();
