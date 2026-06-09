# API ABW Online OS

Wszystkie odpowiedzi i zadania uzywaja JSON. Endpointy chronione wymagaja:

```http
Authorization: Bearer <JWT>
```

## POST /register

Tworzy konto. Pierwsze konto w pustej bazie otrzymuje role `admin`.

```json
{
  "fullName": "Tomek",
  "nick": "Tomek",
  "password": "bezpieczne-haslo"
}
```

Odpowiedz zawiera `token` i obiekt `user`.

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

## GET /health

Health check Render. Sprawdza rowniez polaczenie z PostgreSQL.
