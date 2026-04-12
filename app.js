/**
 * app.js — Core state engine & business logic
 * Handles auth, bookings, swaps, validation, persistence
 */

const App = (function () {

  /* ─────────────────────────────────────────
     CONSTANTS
  ───────────────────────────────────────── */
  const SERVICES = [
    { id: 'fade',        name: 'Standard Fade',    price: 150, duration: 30 },
    { id: 'fade-beard',  name: 'Fade & Beard',      price: 200, duration: 45 },
    { id: 'lineup',      name: 'Line-up',           price: 80,  duration: 20 },
    { id: 'shapeup',     name: 'Shape-up',          price: 120, duration: 25 },
    { id: 'full',        name: 'Full Cut & Style',  price: 250, duration: 60 },
    { id: 'kids',        name: 'Kids Cut',          price: 70,  duration: 20 },
  ];

  const TIME_SLOTS = [
    '08:00 AM','08:30 AM','09:00 AM','09:30 AM',
    '10:00 AM','10:30 AM','11:00 AM','11:30 AM',
    '12:00 PM','12:30 PM','01:00 PM','01:30 PM',
    '02:00 PM','02:30 PM','03:00 PM','03:30 PM',
    '04:00 PM','04:30 PM','05:00 PM',
  ];

  const DAYS = ['Today', 'Tomorrow', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const KNOWN_USERS = {
    '0821234567': { name: 'Thabo M.',  phone: '0821234567', avatar: 'TM' },
    '0831234567': { name: 'Sipho K.',  phone: '0831234567', avatar: 'SK' },
    '0841234567': { name: 'Luca N.',   phone: '0841234567', avatar: 'LN' },
    '0851234567': { name: 'Kwame D.',  phone: '0851234567', avatar: 'KD' },
    '0861234567': { name: 'Jabu P.',   phone: '0861234567', avatar: 'JP' },
  };

  /* ─────────────────────────────────────────
     STORAGE LAYER (localStorage shim)
  ───────────────────────────────────────── */
  const Store = {
    _data: {},
    get(key) {
      try { return JSON.parse(localStorage.getItem('barber_' + key)); } catch { return null; }
    },
    set(key, val) {
      try { localStorage.setItem('barber_' + key, JSON.stringify(val)); } catch {}
      this._data[key] = val;
    },
    remove(key) {
      try { localStorage.removeItem('barber_' + key); } catch {}
      delete this._data[key];
    },
  };

  /* ─────────────────────────────────────────
     STATE
  ───────────────────────────────────────── */
  let _state = {
    // Auth
    currentUser: null,
    authStep: 'phone',        // 'phone' | 'otp' | 'name'
    authPhone: '',
    authOTP: '',
    authName: '',
    authError: '',

    // Navigation
    screen: 'auth',           // 'auth' | 'board' | 'book' | 'history'
    tab: 'board',

    // Booking
    booking: {
      selectedService: null,
      selectedDay: null,
      selectedTime: null,
    },

    // Slot state
    mySlot: null,             // { id, date, time, service, price, n, status }
    offering: false,
    swapRequests: [],         // incoming requests from other users

    // Swap
    pendingSwap: null,        // swap card user clicked on
    swapHistory: [],

    // Market
    marketSwaps: [],

    // Toast
    toast: null,

    // Nudge
    nudge: false,

    // Modals
    modal: null,              // 'swap-confirm' | 'book-confirm' | 'cancel-confirm'
  };

  // Timers
  let _nudgeTimer = null;
  let _toastTimer = null;
  let _otpTimer   = null;

  // Subscribers
  let _listeners = [];

  /* ─────────────────────────────────────────
     UTILS
  ───────────────────────────────────────── */
  function uid() {
    return Math.random().toString(36).slice(2, 9);
  }

  function initials(name) {
    return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
  }

  function formatPhone(raw) {
    const digits = raw.replace(/\D/g, '');
    if (digits.length <= 3)  return digits;
    if (digits.length <= 6)  return digits.slice(0,3) + ' ' + digits.slice(3);
    return digits.slice(0,3) + ' ' + digits.slice(3,6) + ' ' + digits.slice(6,10);
  }

  function validatePhone(phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10)       return 'Enter a valid 10-digit SA number';
    if (!digits.match(/^0[6-8]/))   return 'Must start with 06, 07, or 08';
    return null;
  }

  function generateOTP() {
    // Fake OTP — always 1234 for demo
    return '1234';
  }

  function priceDiff(a, b) {
    const d = b - a;
    if (d === 0) return { label: 'Same price',       cls: 'dc-eq', icon: 'eq' };
    if (d >  0)  return { label: `+R${d} pricier`,   cls: 'dc-up', icon: 'up' };
    return             { label: `R${Math.abs(d)} cheaper`, cls: 'dc-dn', icon: 'dn' };
  }

  function getTimeString() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  /* ─────────────────────────────────────────
     MARKET SEED (other users' listed slots)
  ───────────────────────────────────────── */
  function seedMarket() {
    const users = Object.values(KNOWN_USERS);
    const seeds = [
      { user: users[0], day: 'Tomorrow',  time: '10:00 AM', svcId: 'fade-beard' },
      { user: users[1], day: 'Thursday',  time: '01:30 PM', svcId: 'lineup'     },
      { user: users[2], day: 'Friday',    time: '03:00 PM', svcId: 'fade'       },
      { user: users[3], day: 'Saturday',  time: '11:00 AM', svcId: 'shapeup'    },
      { user: users[4], day: 'Wednesday', time: '09:00 AM', svcId: 'full'       },
    ];
    _state.marketSwaps = seeds.map(s => {
      const svc = SERVICES.find(x => x.id === s.svcId);
      return {
        id:      uid(),
        date:    s.day,
        time:    s.time,
        service: svc.name,
        price:   `R${svc.price}`,
        n:       svc.price,
        user:    s.user.name,
        avatar:  s.user.avatar,
        listedAt: Date.now() - Math.floor(Math.random() * 3600000),
      };
    });
  }

  /* ─────────────────────────────────────────
     EMIT
  ───────────────────────────────────────── */
  function emit() {
    _listeners.forEach(fn => fn({ ..._state }));
  }

  /* ─────────────────────────────────────────
     AUTH ACTIONS
  ───────────────────────────────────────── */
  function submitPhone(rawPhone) {
    const digits = rawPhone.replace(/\D/g, '');
    const error  = validatePhone(digits);
    if (error) {
      _state.authError = error;
      emit(); return;
    }
    _state.authPhone = digits;
    _state.authError = '';
    _state.authStep  = 'otp';
    _state.authOTP   = generateOTP();
    // Simulate SMS delay
    console.info(`[Auth] OTP for ${digits}: ${_state.authOTP}`);
    emit();
  }

  function submitOTP(entered) {
    if (entered.replace(/\D/g,'') !== _state.authOTP) {
      _state.authError = 'Incorrect code — try again';
      emit(); return;
    }
    _state.authError = '';
    const known = KNOWN_USERS[_state.authPhone];
    if (known) {
      _finishLogin(known);
    } else {
      _state.authStep = 'name';
      emit();
    }
  }

  function submitName(name) {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      _state.authError = 'Please enter your name';
      emit(); return;
    }
    const user = {
      name:   trimmed,
      phone:  _state.authPhone,
      avatar: initials(trimmed),
    };
    _finishLogin(user);
  }

  function _finishLogin(user) {
    _state.currentUser = user;
    _state.authError   = '';
    _state.screen      = 'board';
    _state.tab         = 'board';
    Store.set('user', user);
    seedMarket();
    // Restore saved slot if any
    const savedSlot = Store.get('mySlot_' + user.phone);
    if (savedSlot) {
      _state.mySlot    = savedSlot;
      _state.offering  = Store.get('offering_' + user.phone) || false;
    }
    const savedHist = Store.get('history_' + user.phone);
    if (savedHist) _state.swapHistory = savedHist;
    emit();
  }

  function logout() {
    _state.currentUser = null;
    _state.screen      = 'auth';
    _state.authStep    = 'phone';
    _state.authPhone   = '';
    _state.authError   = '';
    _state.mySlot      = null;
    _state.offering    = false;
    _state.tab         = 'board';
    emit();
  }

  /* ─────────────────────────────────────────
     BOOKING ACTIONS
  ───────────────────────────────────────── */
  function setBookingService(svcId) {
    _state.booking.selectedService = SERVICES.find(s => s.id === svcId) || null;
    _state.booking.selectedDay     = null;
    _state.booking.selectedTime    = null;
    emit();
  }

  function setBookingDay(day) {
    _state.booking.selectedDay  = day;
    _state.booking.selectedTime = null;
    emit();
  }

  function setBookingTime(time) {
    _state.booking.selectedTime = time;
    emit();
  }

  function openBookConfirm() {
    const { selectedService, selectedDay, selectedTime } = _state.booking;
    if (!selectedService || !selectedDay || !selectedTime) return;
    _state.modal = 'book-confirm';
    emit();
  }

  function confirmBooking() {
    const { selectedService, selectedDay, selectedTime } = _state.booking;
    if (!selectedService || !selectedDay || !selectedTime) return;

    _state.mySlot = {
      id:      uid(),
      date:    selectedDay,
      time:    selectedTime,
      service: selectedService.name,
      price:   `R${selectedService.price}`,
      n:       selectedService.price,
      status:  'confirmed',
      bookedAt: Date.now(),
    };
    _state.offering = false;
    _state.booking  = { selectedService: null, selectedDay: null, selectedTime: null };
    _state.modal    = null;
    _state.tab      = 'board';
    _state.screen   = 'board';

    Store.set('mySlot_' + _state.currentUser.phone, _state.mySlot);
    _showToast('Booking confirmed!', `${_state.mySlot.service} on ${_state.mySlot.date} at ${_state.mySlot.time}`);
  }

  function cancelBooking() {
    _state.modal  = 'cancel-confirm';
    emit();
  }

  function confirmCancelBooking() {
    _state.mySlot   = null;
    _state.offering = false;
    _state.modal    = null;
    Store.remove('mySlot_' + _state.currentUser.phone);
    Store.remove('offering_' + _state.currentUser.phone);
    _showToast('Booking cancelled', 'Your slot has been released');
  }

  /* ─────────────────────────────────────────
     SWAP ACTIONS
  ───────────────────────────────────────── */
  function offerSlot() {
    if (!_state.mySlot) return;
    _state.offering = true;
    _state.nudge    = false;
    Store.set('offering_' + _state.currentUser.phone, true);
    emit();
  }

  function withdrawOffer() {
    _state.offering = false;
    Store.set('offering_' + _state.currentUser.phone, false);
    emit();
  }

  function initiateClaim(swapId) {
    if (!_state.offering) {
      _showNudge();
      return;
    }
    const swap = _state.marketSwaps.find(s => s.id === swapId);
    if (!swap) return;
    _state.pendingSwap = swap;
    _state.modal       = 'swap-confirm';
    emit();
  }

  function confirmSwap() {
    const s = _state.pendingSwap;
    if (!s || !_state.mySlot) return;

    const entry = {
      id:    uid(),
      gave:  { ..._state.mySlot },
      got:   { ...s },
      with:  s.user,
      when:  getTimeString(),
      date:  new Date().toLocaleDateString('en-ZA'),
      type:  'swap',
    };

    _state.swapHistory.unshift(entry);
    _state.mySlot      = { id: uid(), date: s.date, time: s.time, service: s.service, price: s.price, n: s.n, status: 'confirmed', bookedAt: Date.now() };
    _state.marketSwaps = _state.marketSwaps.filter(x => x.id !== s.id);
    _state.offering    = false;
    _state.pendingSwap = null;
    _state.modal       = null;

    Store.set('mySlot_'   + _state.currentUser.phone, _state.mySlot);
    Store.set('history_'  + _state.currentUser.phone, _state.swapHistory);
    Store.set('offering_' + _state.currentUser.phone, false);

    _showToast('Swap locked in!', 'Both calendars have been updated');
  }

  /* ─────────────────────────────────────────
     UI ACTIONS
  ───────────────────────────────────────── */
  function setTab(t) {
    _state.tab = t;
    emit();
  }

  function navigateTo(s) {
    _state.screen = s;
    emit();
  }

  function closeModal() {
    _state.modal       = null;
    _state.pendingSwap = null;
    emit();
  }

  function setAuthStep(step) {
    _state.authStep  = step;
    _state.authError = '';
    emit();
  }

  function _showNudge() {
    _state.nudge = true;
    emit();
    clearTimeout(_nudgeTimer);
    _nudgeTimer = setTimeout(() => { _state.nudge = false; emit(); }, 3800);
  }

  function _showToast(title, sub) {
    _state.toast = { title, sub };
    emit();
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => { _state.toast = null; emit(); }, 3500);
  }

  /* ─────────────────────────────────────────
     SUBSCRIPTIONS
  ───────────────────────────────────────── */
  function subscribe(fn) {
    _listeners.push(fn);
    fn({ ..._state }); // immediate emit
    return () => { _listeners = _listeners.filter(l => l !== fn); };
  }

  /* ─────────────────────────────────────────
     INIT — try restore session
  ───────────────────────────────────────── */
  function init() {
    const saved = Store.get('user');
    if (saved) {
      _state.currentUser = saved;
      _state.screen      = 'board';
      _state.tab         = 'board';
      seedMarket();
      const savedSlot = Store.get('mySlot_' + saved.phone);
      if (savedSlot) {
        _state.mySlot   = savedSlot;
        _state.offering = Store.get('offering_' + saved.phone) || false;
      }
      const savedHist = Store.get('history_' + saved.phone);
      if (savedHist) _state.swapHistory = savedHist;
    }
  }

  init();

  /* ─────────────────────────────────────────
     PUBLIC API
  ───────────────────────────────────────── */
  return {
    // Data
    SERVICES,
    TIME_SLOTS,
    DAYS,
    // Helpers
    priceDiff,
    formatPhone,
    initials,
    // Auth
    submitPhone,
    submitOTP,
    submitName,
    logout,
    setAuthStep,
    // Booking
    setBookingService,
    setBookingDay,
    setBookingTime,
    openBookConfirm,
    confirmBooking,
    cancelBooking,
    confirmCancelBooking,
    // Swap
    offerSlot,
    withdrawOffer,
    initiateClaim,
    confirmSwap,
    // UI
    setTab,
    navigateTo,
    closeModal,
    // State
    subscribe,
    getState: () => ({ ..._state }),
  };
})();
