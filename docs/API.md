# API ABW Online OS

Wszystkie odpowiedzi i zadania uzywaja JSON. Endpointy chronione wymagaja:

```http
Authorization: Bearer <JWT>
```

## POST /register

Publiczna rejestracja jest wylaczona. Endpoint zwraca `403`, poniewaz konta
moze tworzyc tylko zalogowany administrator przez `POST /users`.

## POST /login

```json
{
  "nick": "Tomek",
  "password": "bezpieczne-haslo"
}
```

Nick moze zostac zastapiony numerem odznaki. Odpowiedz zawiera JWT.

## GET /sync

Zwraca rekordy wspolne oraz prywatne rekordy aktywnego konta. Administrator
otrzymuje prywatne rekordy wszystkich kont potrzebne do panelu administracyjnego.

## POST /sync

```json
{
  "records": [
    {
      "key": "notes",
      "scope": "private",
      "owner_user_id": "uuid",
      "data": { "text": "Notatka", "updatedAt": 1781020000000 },
      "updated_at": "2026-06-09T20:00:00.000Z"
    }
  ]
}
```

Odpowiedz:

```json
{
  "accepted": [],
  "conflicts": [],
  "server_time": "2026-06-09T20:00:01.000Z"
}
```

## GET /users

Zwraca konta potrzebne do misji i identyfikacji. Pola blokad sa widoczne tylko
administratorowi.

## Endpointy panelu admina

- `POST /users` - dodanie konta,
- `PATCH /users/:id` - edycja, blokada i reset blokady,
- `DELETE /users/:id` - usuniecie konta.

## Komunikator

- `GET /messages` - lista rozmow i liczba nieprzeczytanych wiadomosci,
- `POST /messages/direct` - utworzenie rozmowy z wybranym uzytkownikiem,
- `POST /messages/groups` - utworzenie grupy,
- `GET /messages/:conversationId` - pobranie wiadomosci,
- `POST /messages/:conversationId` - wyslanie wiadomosci,
- `POST /messages/:conversationId/read` - oznaczenie rozmowy jako przeczytanej.

Nazwy uczestnikow komunikatora sa zwracane jako nicki. Dostep do komunikatora
moze zostac wylaczony dla wybranej rangi przez administratora.

## GET /health

Health check Render. Sprawdza rowniez polaczenie z PostgreSQL.
