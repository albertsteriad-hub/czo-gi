# ASH CONVOY · Plan produkcji i kryteria odbioru

## A. Audyt

Projekt PlayCanvas 1651220, scena Untitled (2660356), gałąź main. Istnieją aktywny BOR_MODULAR_TANK, wyłączony prototyp AC Heavy Tank i północna trasa. Assets pokazało 15 kontenerów BÓR. Lokalne pliki obejmują pięć plansz, 15 GLB, BOR.blend, dwa generatory Blender Python oraz weryfikację GLB. Blender 5.3.0 działa. Lokalny folder nie ma .git. GitHub albertsteriad-hub/czo-gi jest dostępny przez konektor. Na początku audytu runtime Launch nie był połączony. Widoczność i stan edytora nie potwierdzają działania kodu w Launch.

## B. Dokumentacja

WORLD_BIBLE, GAME_DESIGN, VEHICLE_SYSTEM, ART_DIRECTION, QUEST_DESIGN i ROADMAP opisują pełną wizję. Dokumentacja i kod podlegają synchronizacji z GitHub w granicach uprawnień. Zasoby źródłowe pozostają poza synchronizacją, dopóki nie ma uzgodnionego sposobu przechowywania binariów.

## C. Fundament

Rozdziel odpowiedzialność za pojazdy, załogę, kontrakty, frakcje, świat, ekwipunek i ekonomię, zapis oraz audio. Dla przedmiotów, zleceń, mutantów i frakcji używaj danych ze stałymi identyfikatorami i wersjonuj format zapisu. Oddziel logikę reguł od integracji z PlayCanvas. Przed większą zmianą utwórz punkt kontrolny i zachowaj istniejące prototypy.

## D. Pierwszy grywalny wycinek

| Obszar | Kryterium zaliczenia |
|---|---|
| Pojazd | BÓR z autorskich GLB jeździ, zderza się z otoczeniem, ma działający obrót i wymianę P-2/T-6 |
| Lokacja | Jeden dopracowany sektor łączy las, wieś, drogę i opuszczony teren przemysłowy |
| Załoga | Pięć postaci ma role, podstawowe statystyki i dialogi reagujące na podróż lub kontrakt |
| Kontrakt | Coś w zbożu przechodzi od rozpoznania po konsekwencje, z co najmniej dwoma wynikami |
| Ekologia i anomalie | Dzikoryj reaguje na otoczenie. Szeptnik daje użyteczną wskazówkę i fałszywy sygnał |
| Warsztat i ekonomia | Zmiana wieży zmienia siatkę i parametry. Paliwo, amunicja, naprawa, wypłata i co najmniej dwie reputacje wpływają na grę |
| Trwałość | Zapis i odczyt zachowują stan pojazdu, zapasy, kontrakt i reputację w obsługiwanym zakresie |

Buduj iteracyjnie. Kolejność pierwszych prac to działający rdzeń zasobów i zapisu, potwierdzenie jazdy i strzelania w Launch, sektor Dolin Osadników, kompletne zlecenie oraz warsztat. Szersze sektory, ekosystemy i główny wątek powstają po zaliczeniu wycinka. Demonstracje oznaczaj wprost.

## E. Weryfikacja

Sprawdź import, położenie i kolizje modułów, grunt, jazdę, zmianę wież, rezultat kontraktu, stan zasobów i odczyt po ponownym uruchomieniu. W raporcie podaj utworzone pliki i obiekty, wykonane testy, braki i następny krok. Przy blokadzie podaj dokładny błąd oraz wypróbowane drogi dostępu.

## Pierwsza implementacja

Skrypt ash-company.js przechowuje zapasy i pięć profili załogi. bor-systems.js zużywa paliwo wraz z ruchem i obrotem oraz odejmuje amunicję przy strzale. Zapis przeglądarkowy v1 pozwala przywrócić paliwo, amunicję i wieżę. Reputacja ma dwa wpisy początkowe. Załoga i reputacja nie mają jeszcze zdarzeń w grze. Przed zmianą zapisano punkt kontrolny PlayCanvas 6a4670dc-127c-454f-b871-30549e867ae8. Lokalnie zaliczono próby zużycia paliwa, limitu amunicji i poprawnego oraz błędnego zapisu. Próba nowego Launch została zablokowana przez mechanizm wyskakujących okien edytora.

## Po pierwszym wycinku

W starszym planie przewidziano zakres masy 45–65 t dla ciężkiego pojazdu, trzy wieże, trzy działa i dwa kadłuby, próby wydajności i jazdy na trzech nawierzchniach, eskortę konwoju, odzysk części, wrogie pojazdy i modułowe uszkodzenia. Zachowujemy te cele do rozbudowy po odbiorze pierwszego wycinka z P-2 i T-6.


## Rozbudowa mapy 20×
 
Obrys dotychczasowego gruntu miał 122 × 225 jednostek. Rozbudowa używa granic X od −300 do 300 i Z od −150 do 765. Powierzchnia 549 000 jednostek kwadratowych jest dokładnie 20 razy większa. Trzydzieści sektorów po 100 × 183 jednostki dzieli obszar na komórki z detalami włączanymi w pobliżu gracza. Droga, grunty i większe punkty orientacyjne pozostają widoczne niezależnie od przełączania detali. Istniejąca lokacja kontraktu mieści się wewnątrz nowego obrysu.
 
PlayCanvas: ASH_WORLD_EXPANSION pod AC Wasteland. Punkt kontrolny sprzed rozbudowy 049ef469-3608-42ea-9e77-f12ac29913eb. Logika dróg, wysokości i sektorów znajduje się w ash-world.js. bor-systems.js wykorzystuje ją do granic i przyczepienia pojazdu do gruntu, a ash-service.js obsługuje dodatkowe stanowiska.

## Północne przedłużenie

Obrys rozszerzono o 732 jednostki wzdłuż osi Z, do granic X od −300 do 300 i Z od −150 do 1497. Mapa ma 54 sektory. build_north_terrain.py generuje z logiki ash-world.js cztery siatki reliefu, dwie rzeki i model jodły. Osobne grupy zachowują drogę i konstrukcje przepraw podczas wyłączania odległych drzew. Woda blokuje przejazd poza przeprawami. Punkt kontrolny przed zmianą a4747d1d-1d3f-4162-8ac5-4f89b48698a0.

