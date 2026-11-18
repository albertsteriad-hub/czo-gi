# ASH CONVOY · System pojazdów

Punktem wyjścia jest autorski BÓR z zaakceptowanych plików w models. Rodziny rozwijamy według plansz, zaczynając od BÓR, ŻMIJA, TARAN, WAŁ, RAD, KRET, WIDMO i BASTION. KV-2 nie jest modelem docelowym.

## Montaż

Model dzielimy na kadłub, wieżę lub kazamatę, działo, zawieszenie, lewą i prawą gąsienicę, dodatkowy pancerz, silnik, zbiorniki, wyposażenie zewnętrzne, optykę, lemiesze, tarany, osłony, urządzenia specjalne i oznaczenia. Moduł ma katalogowy identyfikator, slot montażowy, kompatybilność, zasób geometrii, masę, cenę, zapotrzebowanie na moc i efekty. Zmiana części wpływa na geometrię, sylwetkę i parametry. Warsztat pokazuje obracany model, porównanie części oraz koszty i skutki montażu.

W Blenderze jednostką jest metr, oś Z prowadzi w górę, a przód BÓR leży na +Y. GLB ma +Y w górę i przód −Z. W PlayCanvas grupa wizualna ma obrót 180° wobec sterownika jeżdżącego w stronę +Z. P-2 i T-6 mają osobne obiekty i wspólny pierścień. Punkt pierścienia w Blenderze to (0, 0.35, 1.91), a w lokalnych współrzędnych GLB (0, 1.91, −0.35). Kadłub i zawieszenie odnoszą się do wspólnego początku pojazdu. Przyszłe punkty działa, osprzętu i silnika muszą mieć jawne identyfikatory oraz lokalne transformacje.

## Jazda

Sterowanie to W/S do jazdy i A/D do skrętu. Wieża porusza się niezależnie. Docelowy napęd oblicza masę modułów, moc i moment silnika, przyspieszenie, hamowanie, bezwładność, opory i przyczepność dla asfaltu, błota, piasku, trawy i gruntu. Uwzględnia zbocza, limity obrotu i jazdy, hamowanie gąsienicami oraz uszkodzenia silnika i układu jezdnego. Widoczny ruch kół i ogniw wynika z obrotu oraz drogi każdej strony. Docelowe zawieszenie reaguje na teren.

Prototyp wykorzystuje skryptowy model masy, ruchu, wysokości i kolizji. To punkt wyjścia do fizyki napędu. W aktualnej scenie klawisze 1/2 zmieniają wieżę, Q/E ją obracają, spacja lub lewy przycisk myszy strzela.
