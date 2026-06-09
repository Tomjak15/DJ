# Mechanizm synchronizacji

## Podzial danych

Rekordy `shared` obejmuja ogloszenia, informacje, sklep, mape, misje,
zdarzenia i logi. Rekordy `private` obejmuja notatki, koszyk, zamowienia,
ustawienia, pliki systemowe, konfiguracje i profil danego uzytkownika.

## Cykl klienta

1. Po logowaniu klient pobiera `/sync` oraz `/users`.
2. Lokalna zmiana trafia do kolejki i jest wysylana przez `POST /sync`.
3. Co 10 sekund klient ponownie wykonuje `GET /sync`.
4. Kazdy rekord ma zapamietana serwerowa wersje `updated_at`.

## Konflikt

Klient wysyla `updated_at` wersji, od ktorej rozpoczal edycje. Backend blokuje
rekord w transakcji i porownuje te wartosc z aktualna wersja PostgreSQL.

- wersje zgodne: zmiana zostaje zaakceptowana i otrzymuje nowe `updated_at`,
- wersje rozne: serwer zwraca rekord w `conflicts` i nie wykonuje nadpisania.

Frontend stosuje zasade **server wins**. Pokazuje komunikat i laduje nowsza
wersje serwerowa. Zapobiega to cichemu utraceniu zmian wykonanych na drugim
komputerze.
