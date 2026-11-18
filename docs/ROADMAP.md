# ASH CONVOY — plan realizacji

## Etap 0: baza projektu
- [x] Repozytorium GitHub i dokumentacja.
- [x] Fundamenty skryptów jazdy i systemu zamiany wyglądu części (kod, bez sceny).
- [ ] Połączenie edytora PlayCanvas przez MCP lub inny obsługiwany interfejs.
- [ ] Zaimportowanie modeli/sceny do edytora i test uruchomienia.

## Etap 1: vertical slice
1. **Jeden czołg** o masie około 45–65 t, szeroki kadłub, ciężkie gąsienice i niezależna wieża.
2. Co najmniej 3 realnie różne modele wież, 3 działa i 2 kadłuby.
3. Model jazdy z ograniczeniem trakcji, rozbiegiem, bezwładnością skrętu i oporem podłoża.
4. Mapa testowa: odcinek drogi, wieś, las, nierówny grunt i teren przemysłowy.
5. Materiały PBR (metalness/roughness/normal), warstwowe dźwięki silnika/gąsienic oraz przestrzenne eksplozje.
6. Warsztat: podgląd zmiany sylwetki przed zakupem; kontrola masy i poboru mocy.
7. Testy FPS, kolizji i jazdy na 3 nawierzchniach.

## Etap 2: gra
- System załogi i stanowisk.
- Eskorta konwoju, odzysk części, ekonomia paliwa i napraw.
- Wrogie pojazdy, trafienia i modułowe uszkodzenia.
- Zapisy gry i optymalizacja LOD.

## Warunki jakości
- Moduł nie może być wyłącznie zmianą statystyk: musi przełączać odrębny model/obiekt 3D.
- Masa ma wpływać na dynamikę jazdy i skrętu.
- Żadnych pustych kilometrów pustyni jako substytutu mapy.
- Niezmienny cel stylistyczny: masywność, zabrudzenie, stal, rdza, brak kreskówkowej saturacji.
- Cel wizualny „zbliżać się do jakości gier czołgowych AAA” to kierunek, a nie obietnica jakości bez profesjonalnych zasobów 3D.
