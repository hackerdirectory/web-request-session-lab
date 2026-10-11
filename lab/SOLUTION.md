# Beklenen açıklama ve çözüm

## WEB-LAB-01

Bulunan fixture, `GET /api/book?case=found`, HTTP 200 ve `application/json; charset=utf-8` döndürür. Body içindeki kitabın adı Atlas Notları’dır. Eksik fixture `GET /api/book?case=missing`, HTTP 404 ve `book-not-found` döndürür. Her response `X-Request-ID` ile body/trace requestId’sini eşler. Request correlation, tek trace’in eksiksiz veya gerçek packet capture olduğunu kanıtlamaz.

Bekleme seçiliyken `fetch` response gelir, JSON parsing tamamlanır ve body browser JS state’inde tutulur. Kitap panelinin metni henüz değişmez. Render düğmesi body’yi `textContent` ile DOM’a yazar; ardından browser’ın layout/paint işleri gelir. Uygulamanın timeline’ı DOM assignment anını kaydeder, fiziksel display paint zamanını ölçmez. Bu nedenle kanıtta “DOM update” demek doğru; “kesin paint tamamlandı” demek fazla iddiadır.

## WEB-LAB-02

Anonymous→login identifier değişir, eski server session store’dan kaldırılır ve yeni session actor’e bağlanır. API viewer değer yerine generation/state gösterir. Checker old-cookie request’inin artık 401 olduğunu doğrular; öğrenci workbook’unda raw değer kopyalamak gerekmez.

Cookie HttpOnly olduğundan app script’i cookie değerini okuyamaz; browser same-origin request’te cookie’yi taşıyabilir. HttpOnly tek başına action authorization değildir. Demo clock +301 ile server expiry gerçekleşir; cookie browser’da daha uzun kalabilir. Logout server invalidation yanında `Max-Age=0` gönderir. Cookie browser’dan elle silinseydi server store’un kendiliğinden değişmesini beklemek yanlış olurdu; bu görev raw cookie üzerinde müdahale gerektirmez.

Duru member/Atlas/own-read: allow. Farklı owner: deny. Orion: deny. Own-write: role permission yok. Ekin reviewer da yalnız kendi Atlas kaydında read/write permission alır; başka owner/tenant izinli değildir. Write case sadece permission gözlemidir. Client’ta buton göstermek veya gizlemek bu server evaluator’ın yerine geçmez.

Exercise dosyasının düzeltmesi:

```json
{
  "roles": {
    "member": ["read:own"],
    "reviewer": ["read:own", "write:own"]
  }
}
```

Server restart→Duru login→own-read 200; other-owner/Orion/own-write 403. Checker geçmesi HTTP/fixture regression kanıtıdır; öğrencinin mekanizmayı anladığı iddiası için kendi açıklaması ve insan değerlendirmesi gerekir.
