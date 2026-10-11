# Web manual lab — request, session ve resource policy

İki workbook aynı küçük uygulamada çalışır. WEB-LAB-01, WEB-01.02 request dersine; WEB-LAB-02, WEB-13.03 session ve WEB-14.05 authorization derslerine eşlik eder. Önce beklenen davranışı yaz, sonra verilen UI case’ini çalıştır ve kanıtını açıkla.


## Derslerden bu çalışmaya

| Ders | Labda izlediğin sınır | Kaydında göstereceğin kanıt |
|---|---|---|
| WEB-01.02 | Request → response receipt → JSON tüketimi → DOM update | Found/missing için method, path, status ve requestId; receipt sonrası bekleyen DOM |
| WEB-13.03 | Browser cookie jar ile server session store ayrı state taşır | Login rotation, generation, server expiry ve logout sonucu; raw session değerini kaydetmeden |
| WEB-14.05 | Server actor/action/object/tenant kararını her resource isteğinde verir | Own/other-owner/Orion/read/write için reason ve ret dalında resource body yokluğu |

Sitedeki lab sayfası bu workbook’ü, ipuçlarını ve çözümü birlikte sunar. **Kaynak paketi indir** ile ZIP’i alıp çıkar; çalıştırmak için GitHub hesabı veya repository clone gerekmez. Workbook’ü okuyup tahminlerini yazdıktan sonra aşağıdaki yerel kuruluma geç. Kaynak repository’si kullanılıyorsa aynı çalışma dosyaları `labs/web/pilot` altındadır.

## Çalıştırma

### Terminal ilk kez kullanıyorsan

Windows’ta PowerShell veya Windows Terminal, macOS’ta Terminal, Linux’ta bir terminal aç. Önce kontrol et:

```sh
node --version
```

Komut bir version göstermeli; bu labın minimumu Node.js 20’dir. Node bulunamıyorsa [resmî Node.js indirme sayfasından](https://nodejs.org/en/download) işletim sistemine uygun güncel LTS installer’ını kur, terminali yeniden aç ve kontrolü tekrarla. Dersleri okumak veya browser workbook’ünü açmak için bu kurulum gerekmez.

ZIP’i çıkar ve `server.mjs` dosyasının bulunduğu `web-pilot` klasörünü bul. Terminalde `cd` ile **bu klasöre** geç. Tam yolu tırnak içine al; örnek yolların yerine kendi çıkardığın klasörün yolunu yaz:

```sh
# macOS için örnek
cd "/Users/kullanici/Downloads/web-pilot"
# Linux için örnek
cd "/home/kullanici/Downloads/web-pilot"
```

```powershell
# Windows için örnek
cd "C:\Users\kullanici\Downloads\web-pilot"
```

`Cannot find module ... server.mjs` hatası alırsan önce klasörü kontrol et; Node’u tekrar kurmak yerine `server.mjs` dosyasının bulunduğu dizine geç.

Node.js 20+ yeterli. Runtime yalnız Node builtins kullanır; package install, Docker, hesap, dış servis veya gerçek veri gerekmez. Repository kullanıyorsan önce `cd labs/web/pilot` ile lab klasörüne geç. ZIP indirdiysen çıkarılan `web-pilot` klasöründe terminal aç. Ardından:

```sh
node server.mjs
```

Browser’da `http://127.0.0.1:4191/` aç. `localhost` yerine bu adresi kullan: server yalnız tam loopback authority’yi kabul eder. Port çakışırsa `node server.mjs --port 4192` çalıştır ve browser adresindeki portu da değiştir. Terminalde Ctrl+C ile durdur. Restart bütün ephemeral store’u kaybeder; yeni session kurmak gerekir.

UI’daki **Yalnız bu labı resetle**, bu process’in session store, trace ve demo clock’unu temizler; diskte dosya silmez. Cookie’ler port ile ayrılmaz. Aynı 127.0.0.1 host’unda birden fazla lab instance’ını aynı browser profile’da çalıştırma; bağımsız denemeler için ayrı profile kullan.

## WEB-LAB-01 — Request’i elle izlemek

### Çalışma kaydını hazırla

Bir metin dosyası veya kâğıt aç. Her deneme için satırı kopyala; **tahmin** sütununu düğmeye basmadan önce, **gözlem** ve **gerekçe** sütunlarını sonra doldur. Bu rehber browser’da otomatik not kaydetmez.

| Deneme | Tahminim | Gözlemim | Gerekçem / eksik kanıt |
|---|---|---|---|
| Kitap bulundu | GET; status 200; body’de kitap verisi bekliyorum. Receipt sonrası ekranın değişip değişmediğini ayrıca kontrol edeceğim. | Network’te gördüğüm method/path/status/requestId ve body özeti: …; kitap paneli: … | Tahminimle fark: …; receipt ile DOM update’i ayıran gözlem: … |
| Kitap bulunamadı | Çalıştırmadan önce kendin yaz: … | Kendi gözlemin: … | Sonucu destekleyen alan ve eksik kanıt: … |

İlk satır örnek bir **tahmindir**, yapılmış bir lab gözlemi değildir. Kendi çalıştırdığın request’in değerlerini yaz; sonucu bu tablodan kopyalama.

1. DevTools Network panelini aç. Kaydı temizle. **Response geldikten sonra DOM update için bekle** seçili kalsın.
2. **Kitap bulundu** seçip göndermeden önce method, path, status ve body için tahminini yaz. **Request gönder** düğmesini kullan.
3. `/api/book?case=found` kaydında method, `Content-Type`, `X-Request-ID` ve JSON body’yi incele. Panelin timeline’ında response receipt/JSON parsing tamamlanmıştır; kitap sonuç paneli hâlâ önceki state’tedir.
4. **Bekleyen body’yi DOM’a yaz** düğmesine bas. DOM update ile receipt’i aynı olay saymamanın nedenini kendi cümlenle yaz. Bu düğme öğretim için eklenmiş bir bekleme noktasıdır; her gerçek UI’ın ayrıca düğme kullanması gerektiği anlamına gelmez.
5. **Kitap bulunamadı** case’ini seç. 404 response body ve trace’i aynı `requestId` ile eşleştir. HTTP 404 ile network bağlantı hatasının farkını belirt: burada server’a ulaşılmış ve JSON response alınmıştır.
6. Beklemeyi kapatıp bulunan case’i tekrar çalıştır. Aynı request semantiğinde uygulamanın DOM update zamanlaması değişebilir mi?

Kanıt sayfan en az iki response için method/path/status/content type/requestId, JSON sonucunun kısa özeti ve receipt→DOM ayrımını içersin. Byte-identical HAR export gerekmez. Book endpoint’i in-memory seeded lookup yapar; trace’teki lookup satırı SQL, packet veya driver capture değildir.

## WEB-LAB-02 — Cookie, store ve karar

Fixture isimleri dersle eşleşir: Duru’nun internal actor ID’si `alice`, Ekin’in `bob`; tenant’lar Atlas/Orion. `fixtures.json` herkese açık sentetik öğretim verisidir. Gerçek hesap oluşturma veya password doğrulama yapılmaz: **Demo login** seçili identity’yi server store’a bağlar.

1. Resetle, DevTools Application/Cookies ve Network’ü aç. **Anonymous session başlat**. Cookie adı/flags ve sanitized store’daki generation/authenticated alanlarını karşılaştır. Cookie değerini kanıt dosyana kopyalama.
2. Duru ile **Demo login / rotation** çalıştır. Yeni `Set-Cookie` gelir; generation artar, eski server session kaldırılır. Ledger’daki `rotated` ve `authenticated-session-created` kayıtlarını bul. Browser cookie jar’ı ile server store ayrı authority’lerdir.
3. Her case için düğmeye basmadan önce kararını yaz. **Own resource/read** Duru’nun `report-atlas-01` kaydını; **same tenant/other owner** Ekin’in kaydını; **Orion** farklı tenant’ı seçer. **Write-own** yalnız permission kararıdır; veri değiştirmez.
4. Decision trace’te actor, action, object, actorTenant, objectTenant, result/reason ve `requestId` alanlarını eşleştir. Denied response’ta resource title/body bulunmamasını kontrol et. Client actor/role/tenant seçimini request body’ye taşımıyor; server session actor’ü belirliyor.
5. **Demo clock +301 saniye**. Server TTL 300 demo saniyesidir; sonraki state/resource gözleminde session expire olur. Cookie Max-Age 900 gerçek saniye olduğundan cookie browser’da kalabilir. Bu iki zaman kaynağı kasıtlı ayrılmıştır; network request’i server’ın clock değerlendirmesini tetikler.
6. Ekin ile tekrar login ol. Own-read ve own-write kararlarını, başka owner/tenant denial’larını karşılaştır. Role farkı tenant/ownership kontrolünü ortadan kaldırmaz.
7. **Logout**. `Max-Age=0` browser cookie’sini kaldırır; server da session kaydını invalid eder. Own-resource sonraki request’i authentication gerektirir. Resetle ve temiz state’i doğrula.

| Identity / case | Beklenen HTTP | Decision reason |
|---|---:|---|
| Session yok / own | 401 | authentication-required |
| Duru / own read | 200 | owner-and-role-match |
| Duru / other owner | 403 | owner-mismatch |
| Duru / Orion | 403 | tenant-mismatch |
| Duru / own write | 403 | role-permission-missing |
| Ekin / own read veya write | 200 | owner-and-role-match |
| Ekin / other owner veya Orion | 403 | owner-mismatch veya tenant-mismatch |
| Expired / own | 401 | authentication-required |

## Güvenli policy düzeltmesi

`policy.exercise.json` kasıtlı **fazla kısıtlayıcıdır**: member’ın own-read grant’i eksiktir. Server’ın ownership ve tenant kuralları ayrı ve zorunludur. Önce mevcut server’ı durdur:

```sh
node server.mjs --policy policy.exercise.json
```

Duru login→own-read için 403 gözle. `policy.exercise.json` içinde yalnız member grants listesine `read:own` ekle; server’ı durdurup aynı komutla yeniden başlat, reset/login yap. Own-read 200 olurken other-owner, Orion ve own-write hâlâ 403 kalmalı. Bu dosyayı değiştirince checker’ın own-read beklentisi geçer; grant değişikliği restart gerektirir. Standart çalışan policy `policy.json` altında korunur.

## Son görevleri kendi başına tamamla

Kaydını `.local-results/` altında yerel bir metin dosyasında tut. Çözümü açmadan bu iki kısa görevi tamamla; farklı çıkan ilk tahminini silme.

### WEB-LAB-01 — İki response'u açıkla

Labı sıfırla. Found/missing case'lerinin sırasını kendin seç ve öğretim molasını açık tut. Her response için method, path, status, requestId, kısa body özeti ve pending body uygulanmadan önce/sonra kitap panelinin durumunu kaydet. HTTP response'un geldiğini hangi kanıt, UI'ın veriyi kullandığını hangi kanıt gösteriyor? In-memory lookup trace'inden database query sonucu çıkarma.

### WEB-LAB-02 — Bir izni daralt

`policy.json` dosyasını `.local-results/policy.practice.json` olarak kopyala; gerekiyorsa önce klasörü oluştur. Bu kopyayı Ekin kendi raporunu okuyabilecek ama own-write isteği reddedilecek şekilde değiştir. Member grant'lerini koru. `node server.mjs --policy .local-results/policy.practice.json` ile başlat, sıfırla ve Ekin olarak giriş yap. Own-read, own-write, other-owner ve other-tenant kararlarını önce tahmin et, sonra gözlemle. Status, decision reason, requestId ve resource body dönüp dönmediğini kaydet. Cookie değerlerini kopyalama.

Tamamlama ölçütü: meşru own-read çalışır; kaldırdığın grant reddedilir; ownership ve tenant sınırları korunur. Hangi policy kaydını değiştirdiğini ve bunun neden başka sahibin raporuna erişim vermediğini açıkla. Server'ı durdurup `node server.mjs` ile standart policy'ye dön. Standart checker standart policy'yi doğrular; daralttığın kopyanın kabul testi değildir.

### Tesliminde ne bulunmalı?

Her görev için **tahmin → gözlem → açıklama** ve kanıtın destekleyemediği bir sonuç. Açıklamasız doğru sonuç görevi tamamlamaz. Kaydın yerelde kalır; commit etme veya GitHub'a gönderme.

## Otomatik doğrulama

Server çalışırken ayrı terminalde:

```sh
node checker.mjs
```

Checker **yalnız bu lab namespace’ini resetler**; mevcut manual session/trace’ini temizler. Gerçek HTTP status, header, body, seeded decision, rotation, expiry, logout ve reset’i kontrol eder. Port farklıysa tek argümanla loopback origin ver: `node checker.mjs http://127.0.0.1:4192`.

Checker sonucuna ek olarak gözlenen request, session ve policy sınırlarını kendi cümlelerinle açıkla. İpuçları [HINTS.md](HINTS.md), çözüm [SOLUTION.md](SOLUTION.md) içinde.

## Model sınırı ve kaynaklar

401 response’undaki `WWW-Authenticate: LabSession realm="local-demo"`, bu eğitim app’ine özgü bir challenge label’ıdır; standart OAuth/Bearer flow uygulandığı iddiası değildir.

Bu app in-memory, process-local bir öğretim ortamıdır. Sabit demo clock, public identity selector, policy-fixture metadata ve loopback HTTP cookie’si production login mimarisi olarak sunulmaz. `Secure` flag burada yoktur; HTTPS production cookie policy’si ayrıca tasarlanır. Server yalnız 127.0.0.1’e bind olur, dış CDN/telemetry çağırmaz. Trace/session viewer identifier veya raw Cookie/Set-Cookie değerini göstermez. DevTools kendi browser request’inde cookie’yi doğal olarak görebilir; screenshot/HAR paylaşırken bu alanı kaldır.

- [MDN — Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies): Creating, removing, and updating cookies; Security. Cookie taşıması, regeneration ve Max-Age için.
- [OWASP — Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html): Renew the Session ID After Any Privilege Level Change; Server-Side Session Invalidation. Rotation ve logout server state’i için.
- [OWASP — Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html): Deny by Default; Validate the Permissions on Every Request. Actor/object/tenant kontrolünün server’da yapılması için.

Kaynaklar 2026-10-08 tarihinde kontrol edildi. Fixtured app davranışı kaynak standardının tamamını uyguladığı iddiası değildir. Dış hedef, vulnerability payload, ID enumeration veya auth bypass görevi yoktur.
