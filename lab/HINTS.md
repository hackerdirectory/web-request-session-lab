# Manual lab hints

## Request

Network panelinde yalnız Fetch/XHR filtresini kullan. `/api/state` UI’ın store yenilemesidir; kitabın request’i `/api/book?case=...` olur. Header’daki `X-Request-ID` ile response `requestId` aynı olmalı. 404, `fetch()` için transport failure anlamına gelmez: response status okunabilir, JSON parse edilebilir ve UI kendi kararını verir.

“Body geldi” ile “kitap çizildi”yi ayırmak için sonuç panelinin metnini ve timeline’ı beraber izle. Bekleme seçiliyken body hazırdır; DOM update ikinci düğmeyle olur. Trace’te in-memory lookup görmen gerçek database’a bağlanıldığı anlamına gelmez.

## Session

Cookie flags browser’ın cookie’yi nasıl saklayıp taşıdığını açıklar. `authenticated`, actor ve expiry server store’a aittir. Generation, secret identifier’ın kendisi değildir; karşılaştırma için gösterilen yerel sıra numarasıdır.

Login anonymous generation’ı değiştirir. Demo clock server TTL’i aşarken browser’ın Max-Age süresi aynı anda ileri gitmez. Logout hem server state’ini hem browser cookie’sini etkiler. Restart sonrasında cookie browser’da kalsa bile yeni process onu store’da bulamaz.

## Policy

Önce actor var mı, sonra tenant aynı mı, owner aynı mı, role bu action’ı kendi object’i için yapabilir mi? Bu labın evaluation sırası budur; bütün gerçek ürünlerde tek zorunlu sıra olduğu iddiası değildir. Denial reason bir kontrolün sonucudur; tüm kontrollerin geçildiğini göstermez.

Exercise, doğru kullanıcının kendi kaydını gereksiz yere engeller. Tenant/owner sınırlarını kaldırmana gerek yok. Yalnız `member` için eksik own-read grant’ini geri koy ve denial matrix’ini tekrar çalıştır.
