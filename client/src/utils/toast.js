// client/src/utils/toast.js
//
// Unified toast wrapper — single source of truth for all notifications
// in the client app. Import `toast` from here, NOT directly from "sonner".
//
// API is identical to sonner so no call-sites need to change logic,
// only the import path.

import { toast as _toast } from "sonner";

const DURATION      = 4000;   // ms — auto-dismiss for success / error / info
const LOAD_DURATION = Infinity; // loading toasts stay until explicitly dismissed

function success(msg, opts)  { return _toast.success(msg, { duration: DURATION,      ...opts }); }
function error(msg, opts)    { return _toast.error(msg,   { duration: DURATION,      ...opts }); }
function info(msg, opts)     { return _toast.info(msg,    { duration: DURATION,      ...opts }); }
function warning(msg, opts)  { return _toast.warning(msg, { duration: DURATION,      ...opts }); }
function loading(msg, opts)  { return _toast.loading(msg, { duration: LOAD_DURATION, ...opts }); }

// Pass-throughs — same API as sonner
const dismiss = (...args) => _toast.dismiss(...args);
const promise = (...args) => _toast.promise(...args);

const toast = Object.assign(
  // Allow bare `toast("msg")` calls as a default info toast
  (msg, opts) => info(msg, opts),
  { success, error, info, warning, loading, dismiss, promise }
);

export { toast };
export default toast;