# ABW Online OS

Futurystyczny system ABW z internetowa synchronizacja danych. Frontend jest
podawany przez backend Express, konta korzystaja z JWT, a dane sa zapisywane
w PostgreSQL. Ten sam adres Render dziala na komputerach, telefonach i tabletach.

## Struktura

```text
frontend/   interfejs ABW i modul API Client
backend/    Express, JWT, konta oraz synchronizacja
database/   schemat PostgreSQL
docs/       opis API i mechanizmu konfliktow
```

## Wdrozenie na Render

1. Umiesc projekt w repozytorium GitHub lub GitLab.
2. W Render wybierz **New > Blueprint**.
3. Wskaz repozytorium. Render odczyta `render.yaml`.
4. Zatwierdz utworzenie uslugi `abw-online-os` i bazy `abw-online-db`.
5. Po zakonczeniu wdrozenia otworz:
   **https://abw1.onrender.com**
6. Kliknij **Utworz konto**. Pierwsze zarejestrowane konto automatycznie
   otrzyma role administratora.

`DATABASE_URL` jest pobierany z Render Postgres, a `JWT_SECRET` jest generowany
automatycznie przez Blueprint. Migracja `database/schema.sql` uruchamia sie
przed startem kazdego wdrozenia.

Dokumentacja Render:

- https://render.com/docs/blueprint-spec
- https://render.com/docs/deploy-node-express-app
- https://render.com/docs/postgresql-creating-connecting

## Uruchomienie lokalne

Wymagane sa Node.js 20+ i PostgreSQL.

1. Uzupelnij `.env`:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/abw_os
JWT_SECRET=tu-wpisz-dlugi-losowy-sekret-minimum-24-znaki
API_URL=
```

2. Utworz baze `abw_os`.
3. Uruchom `uruchom-serwer.bat` albo:

```bash
npm run install:backend
npm run migrate
npm start
```

4. Otworz `http://localhost:8080`.

## Synchronizacja

- zmiany sa wysylane automatycznie po wykonaniu operacji,
- notatnik zapisuje sie po kilku sekundach,
- klient pobiera aktualizacje co 10 sekund,
- rekordy wspolne sa widoczne dla wszystkich kont,
- notatki, ustawienia, pliki i konfiguracja sa przypisane do konta,
- administrator moze przegladac dane kont wymagane przez panel ABW,
- konflikt jest wykrywany przez `updated_at`; nowsza wersja serwera nie jest
  nadpisywana przez starszego klienta.

Szczegoly endpointow: [docs/API.md](docs/API.md).
Opis konfliktow: [docs/SYNC.md](docs/SYNC.md).

## Bezpieczenstwo

- hasla sa hashowane przez bcrypt,
- po trzech blednych logowaniach konto jest blokowane na piec minut,
- token JWT wygasa po osmiu godzinach,
- backend sprawdza role administratora niezaleznie od interfejsu,
- `.env` jest ignorowany przez Git i nie powinien trafic do repozytorium.
