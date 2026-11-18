# Podłączenie PlayCanvas — krok po kroku

GitHub jest już podłączony do ChatGPT. **PlayCanvas nie jest jeszcze połączony.**

1. Utwórz projekt 3D na https://playcanvas.com/editor
2. Zbuduj hierarchię sceny: `Tank` → `Modules` → `hull`, `turret`, `gun`, `tracks`, itd.
3. W każdym slocie dodaj osobne obiekty (GLB/model entities) nazwane identyfikatorami w `playcanvas/tank-parts.mjs`. Przykład: `Tank/Modules/turret/standard`, `Tank/Modules/turret/low`.
4. Wgraj pliki `tank-parts.mjs` i `tank-motion.mjs` jako skrypty ESM albo przenieś je do projektu PlayCanvas w zgodzie z aktualnym trybem skryptów edytora.
5. Główne skrypty sceny powinny importować `getTankStats`, `applyTankBuild`, `createTankMotion`, `stepTankMotion`. Kontroler wejścia i synchronizację z silnikiem fizycznym dodamy w następnym etapie.

Uwaga: kod w repozytorium to **fundament logiki**, a nie gra już gotowa do uruchomienia w PlayCanvas. Zmiana wyglądu jest możliwa dopiero po dodaniu realnych wariantów modeli 3D do sceny.

Dla agenta wspierającego MCP: https://developer.playcanvas.com/user-manual/editor/mcp-server/
