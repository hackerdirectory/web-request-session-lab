# Manual lab hints

## Request

Use the Fetch/XHR filter in Network. /api/state refreshes the UI store view; the book request uses /api/book?case=.... X-Request-ID should match the response requestId. A404 is not a fetch transport failure: status and JSON remain available to application code.

Watch both the result-panel text and timeline to separate body receipt from rendering. With the pause enabled, the body is ready but the second button performs DOM assignment. A traced in-memory lookup does not establish a real database connection.

## Session

Cookie flags describe browser storage/transmission. authenticated, actor, and expiry belong to server state. Generation is a local sequence number for comparison, not the secret identifier itself.

Login changes the anonymous generation. Advancing the demo server clock does not advance real browser Max-Age time. Logout affects both server state and browser cleanup. After a restart, a remaining browser cookie may reference nothing in the new process store.

## Policy

This lab asks whether an actor exists, tenant matches, owner matches, and role permits the action on its own object. That evaluation order is selected for this lab, not mandated for every product. A denial reason reports a failed check, not proof that every other check passed.

The exercise unnecessarily denies a legitimate owner. Restore the missing member own-read grant while retaining tenant/owner boundaries, then repeat the denial matrix. Role names alone never define permissions; use the explicit policy.
