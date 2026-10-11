# Web manual lab — request, session, and resource policy

Two workbooks share a small local application. WEB-LAB-01 accompanies WEB-01.02; WEB-LAB-02 accompanies WEB-13.03 and WEB-14.05. Predict the behavior, run the supplied UI case, then explain the evidence.


## From lessons to this workbook

| Lesson | Boundary observed in the lab | Evidence to keep |
|---|---|---|
| WEB-01.02 | Request → response receipt → JSON consumption → DOM update | Method, path, status and requestId for found/missing, with DOM still pending after receipt |
| WEB-13.03 | Browser cookie jar and server session store hold separate state | Login rotation, generation, server expiry and logout without copying raw session values |
| WEB-14.05 | Server decides actor/action/object/tenant permission for each resource request | Reasons for own/other-owner/Orion/read/write, with no resource body on denial |

The site's lab page provides this workbook, hints and solution together. Use **Download source package**, extract the ZIP, and continue with the local setup below; no GitHub account or repository clone is required. Write predictions before observations. If you already use the source repository, the same files are under `labs/web/pilot`.

## Start and reset

### If this is your first terminal session

Open PowerShell or Windows Terminal on Windows, Terminal on macOS, or a terminal on Linux. Check:

```sh
node --version
```

The command should print a version; this lab requires at least Node.js 20. If Node is not found, use the [official Node.js download page](https://nodejs.org/en/download) to install a current LTS version for your operating system, reopen the terminal, and check again. Reading lessons and opening the browser workbook do not require this installation.

Extract the ZIP and find the `web-pilot` folder containing `server.mjs`. Use `cd` to enter **that folder**. Quote the full path; replace the example paths with your actual extracted folder:

```sh
# macOS example
cd "/Users/student/Downloads/web-pilot"
# Linux example
cd "/home/student/Downloads/web-pilot"
```

```powershell
# Windows example
cd "C:\Users\student\Downloads\web-pilot"
```

If you see `Cannot find module ... server.mjs`, check the folder first; enter the directory containing `server.mjs` instead of reinstalling Node.

Node.js 20+ is sufficient. The runtime uses Node builtins, with no package install, Docker, account, external service, or real data. For the repository, first run `cd labs/web/pilot`. For a downloaded ZIP, open a terminal in the extracted `web-pilot` directory. Then:

```sh
node server.mjs
```

Open `http://127.0.0.1:4191/`. Use that exact address rather than localhost: the server accepts its loopback authority only. For another port, run `node server.mjs --port 4192` and change the browser address accordingly. Ctrl+C stops the process; restarting discards its ephemeral store.

The UI reset button clears this process's sessions, trace, and demo clock without deleting disk files. Cookies are not isolated by port. Use a separate browser profile for independent instances on the same 127.0.0.1 host.

## WEB-LAB-01 — Follow a request manually

### Prepare your study record

Open a text file or use paper. Copy a row for each attempt. Fill **prediction** before pressing the button, then **observation** and **reason** afterwards. This guide does not automatically save browser notes.

| Attempt | My prediction | My observation | My reason / missing evidence |
|---|---|---|---|
| Book found | GET; status 200; book data in the body. I will check the screen separately after receipt. | Observed method/path/status/requestId and body summary: …; book panel: … | Difference from my prediction: …; observation separating receipt from DOM update: … |
| Book missing | Write before running: … | Your own observation: … | Supporting field and missing evidence: … |

The first row is an example **prediction**, not a recorded lab observation. Write values from your own request rather than copying a result from this table.

1. Open DevTools Network and clear its records. Keep the option to wait before updating the DOM enabled.
2. Select the found-book case. Predict method, path, status, and body before sending the request.
3. Inspect `/api/book?case=found`: method, Content-Type, X-Request-ID, and JSON body. The teaching timeline has completed response receipt and JSON parsing while the book panel still shows its earlier state.
4. Apply the pending body to the DOM using the UI button. Explain why receipt and DOM update are separate events. This deliberate teaching pause does not mean every real UI needs such a button.
5. Run the missing-book case. Match its 404 body and trace using requestId. Explain why this differs from a network connection failure: a server response was received.
6. Disable the pause and repeat the found case. Can application timing change while request semantics remain the same?

Keep method/path/status/content type/requestId, a short JSON summary, and receipt-to-DOM evidence for two responses. A byte-identical HAR is unnecessary. The endpoint reads seeded in-memory data; its lookup trace is not a SQL, driver, or wire capture.

## WEB-LAB-02 — Cookie, store, and decision

Fixture names match the lessons: Duru's internal ID is alice, Ekin's is bob, and tenants are Atlas/Orion. fixtures.json contains public synthetic teaching data. Demo login binds a selected identity to the server store without creating a real account or checking a password.

1. Reset; open Application/Cookies and Network. Start an anonymous session. Compare cookie name/flags with sanitized store generation/authenticated fields. Do not copy the cookie value into evidence.
2. Run Duru demo login/rotation. A new Set-Cookie arrives, generation increases, and the old server session is removed. Find rotated and authenticated-session-created ledger entries. The browser jar and server store have distinct authority.
3. Predict each decision before selecting its case. Own-read chooses Duru's report-atlas-01; same-tenant/other-owner chooses Ekin's report; Orion selects the other tenant. Write-own checks permission without changing resource data.
4. Match actor, action, object, actorTenant, objectTenant, result/reason, and requestId in the trace. Denied responses omit resource title/body. The client sends no selected role/tenant/actor in the request body: the server session determines the actor.
5. Advance the demo clock by301 seconds. The server TTL is300 demo seconds; the next observation expires the session. Browser cookie Max-Age is900 real seconds, so the cookie can remain. These deliberately separate clocks make server evaluation visible.
6. Log in as Ekin. Compare own-read/write with other-owner/tenant denials. A role difference does not remove tenant or ownership checks.
7. Log out. Max-Age=0 cleans up the browser cookie while the server invalidates its record. A later own-resource request requires authentication. Reset to verify clean state.

| Identity / case | HTTP | Decision reason |
|---|---:|---|
| No session / own |401|authentication-required|
| Duru / own read |200|owner-and-role-match|
| Duru / other owner |403|owner-mismatch|
| Duru / Orion |403|tenant-mismatch|
| Duru / own write |403|role-permission-missing|
| Ekin / own read/write |200|owner-and-role-match|
| Ekin / other owner/Orion |403|owner-mismatch or tenant-mismatch|
| Expired / own |401|authentication-required|

## Restore a legitimate policy grant

policy.exercise.json is deliberately too restrictive: the member own-read grant is missing. Tenant and ownership checks remain mandatory. Stop the current server and start the exercise policy:

```sh
node server.mjs --policy policy.exercise.json
```

Observe Duru own-read returning403. Add only read:own to the member grants list in policy.exercise.json. Stop/restart the same command, reset, and log in. Own-read should now return200 while other-owner, Orion, and own-write still return403. Policy changes require a restart. The standard working policy.json remains available.

## Finish on your own

Use a local text file under `.local-results/` for the record. Complete these two short tasks before opening the solution; keep your first prediction even when it differs.

### WEB-LAB-01 — Explain two responses

Reset the lab. Choose the order of the found/missing cases yourself and keep the teaching pause enabled. For each response, record method, path, status, requestId, a body summary, and what the book panel shows before and after applying the pending body. Explain which evidence proves that an HTTP response arrived and which evidence proves that the UI consumed it. Do not infer a database query from the in-memory lookup trace.

### WEB-LAB-02 — Narrow a permission

Copy `policy.json` to `.local-results/policy.practice.json`; create the directory first if needed. Change this copy so Ekin can read his own report but cannot request own-write. Keep the member grants unchanged. Run `node server.mjs --policy .local-results/policy.practice.json`, reset, and log in as Ekin. Predict and record own-read, own-write, other-owner, and other-tenant decisions. Keep status, decision reason, requestId, and whether a resource body was returned. Do not copy cookies.

Acceptance: legitimate own-read still works; the removed grant is denied; ownership and tenant boundaries remain enforced. Explain which policy entry you changed and why that change cannot grant access to another owner's report. Stop the server and restart with `node server.mjs` to restore the standard policy. The standard checker validates the standard policy; it is not the acceptance test for your restricted copy.

### What to hand in

For each task: **prediction → observation → explanation**, plus one conclusion the evidence cannot support. A result without an explanation is unfinished. Your record stays local; do not commit it or submit it to GitHub.

## Self-check

With the server running, use a separate terminal:

```sh
node checker.mjs
```

The checker resets only this lab namespace, clearing current manual sessions/traces. It checks actual HTTP status/header/body, decisions, rotation, expiry, logout, and reset. For another port, pass its loopback origin, for example `node checker.mjs http://127.0.0.1:4192`.

Beyond the checker result, explain the observed request, session, and policy boundaries in your own words. Use [HINTS](HINTS.en.md) for clues and [SOLUTION](SOLUTION.en.md) after your observations.

## Model limits and sources

The401 challenge LabSession realm="local-demo" is specific to this teaching application, not a standard OAuth/Bearer flow. This is a process-local, in-memory environment: its demo clock, public identity selector, fixture metadata, and loopback HTTP cookie do not model a production login architecture. Secure is absent here; production HTTPS cookie policy needs its own design.

The server binds only127.0.0.1 and calls no external CDN or telemetry. The sanitized viewer omits raw identifiers and Cookie/Set-Cookie values. DevTools naturally exposes your own request cookie: remove that field before sharing screenshots/HAR.

Sources: MDN Cookies (creation/removal/security), OWASP Session Management (renewal/server invalidation), and OWASP Authorization (deny by default/check every request). The app implements selected teaching behaviors, not every requirement in those sources. Exercises use seeded ordinary cases and contain no third-party targets, exploit payloads, enumeration, or authentication-bypass task.
