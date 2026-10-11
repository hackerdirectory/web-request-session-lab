# Expected explanation and solution

## WEB-LAB-01

The found fixture returns GET /api/book?case=found, HTTP200, and application/json; charset=utf-8, with Atlas Notları as the book title. The missing fixture returns GET /api/book?case=missing, HTTP404, and book-not-found. X-Request-ID correlates response, body, and trace identifiers; correlation does not establish a complete trace or packet capture.

With the pause enabled, fetch response receipt and JSON parsing finish while browser JS holds the body. The book panel remains unchanged. The render button assigns textContent; browser layout/paint follow. The teaching timeline records DOM assignment without measuring physical display paint. Report a DOM update rather than claiming that paint definitely completed.

## WEB-LAB-02

Anonymous-to-login changes the identifier, removes the old server session, and binds a new session to the selected actor. The viewer shows generation/state instead of the raw value. Engineering checks verify that the old cookie no longer authenticates; the student need not copy the raw secret.

HttpOnly prevents application script from reading the cookie while the browser can send it on eligible same-origin requests. It does not authorize an action. Advancing the demo clock by301 expires the server record while the browser cookie can remain. Logout additionally sends Max-Age=0. Manually deleting a browser cookie would not automatically change the store; this workbook requires no such intervention.

Duru member/Atlas/own-read is allowed; another owner or Orion tenant is denied. Own-write lacks role permission. In this lab, reviewer Ekin also receives read/write only on the owned Atlas record. The write case observes permission without mutation. Showing or hiding a client button cannot replace the server evaluator.

Restore the exercise grants:

```json
{
  "roles": {
    "member": ["read:own"],
    "reviewer": ["read:own", "write:own"]
  }
}
```

Restart, log in as Duru, and observe own-read200 while other-owner/Orion/own-write remain403. A passing checker is HTTP/fixture regression evidence. Understanding still requires the learner's explanation and independent evaluation.
