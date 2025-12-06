# GET Cash Balance

Endpoint untuk melihat nilai kas saat ini.

- Method: `GET`
- URL: `/api/finance/cash-balance`
- Autentikasi: menggunakan cookie `token` (diatur oleh service core). Pada contoh curl tidak disertakan cookie.

Respons sukses:

- Jika data kas belum ada di tabel `cash_balance`, nilai `balance` akan menjadi `0`.
- Jika data kas sudah ada, `balance` berisi nilai kas yang tersimpan.

Contoh respons:

```json
{
  "success": true,
  "message": "Cash balance retrieved successfully",
  "data": {
    "balance": 0
  }
}
```

Contoh curl (tanpa header cookie, silakan tambahkan sendiri di Postman):

```bash
curl -X GET "http://localhost:3300/api/finance/cash-balance"
```

# GET History Balance

Endpoint untuk melihat history transaksi kas dengan sistem paging `load more` yang efisien (berbasis cursor).

- Method: `GET`
- URL: `/api/finance/cash-balance/history`
- Autentikasi: menggunakan cookie `token` (diatur oleh service core). Pada contoh curl tidak disertakan cookie.

Query params:

- `cursor` (number, optional) �+' id terakhir dari data yang sudah di-load sebelumnya. Jika tidak dikirim, akan mengambil halaman pertama (data terbaru).
- `limit` (number, optional) �+' jumlah data per halaman, minimal `1`, maksimal `100`. Default `10` jika tidak dikirim.

Catatan:

- Data selalu diurutkan berdasarkan `id` secara descending (`id` terbesar / terbaru di atas).
- Mekanisme `cursor` memastikan data yang sudah muncul di halaman sebelumnya tidak muncul lagi saat `load more`, dan tidak menggunakan offset besar yang bisa memberatkan server.

Contoh respons sukses (sekarang setiap item menyertakan `created_by_user` dari service eksternal):

```json
{
  "success": true,
  "message": "History balance retrieved successfully",
  "data": {
    "items": [
      {
        "id": 3,
        "status": true,
        "value": 1000.5,
        "description": "Initial cash",
        "created_by": 1,
        "created_at": "2025-11-23T01:00:00.000Z",
        "created_by_user": {
          "id": 1,
          "email": "john@example.com",
          "name": "John Doe",
          "username": "john",
          "role": { "id": 1, "name": "Admin" },
          "active": "Active",
          "registered_at": "2024-01-01T00:00:00.000Z",
          "contact": null
        }
      },
      {
        "id": 2,
        "status": false,
        "value": 200.25,
        "description": "Cash out",
        "created_by": 1,
        "created_at": "2025-11-23T00:50:00.000Z",
        "created_by_user": {
          "id": 1,
          "email": "john@example.com",
          "name": "John Doe",
          "username": "john",
          "role": { "id": 1, "name": "Admin" },
          "active": "Active",
          "registered_at": "2024-01-01T00:00:00.000Z",
          "contact": null
        }
      }
    ],
    "next_cursor": 2,
    "has_more": true
  }
}
```

Contoh curl (tanpa header cookie, silakan tambahkan sendiri di Postman):

```bash
curl -X GET "http://localhost:3300/api/finance/cash-balance/history?limit=10"
```

# UPDATE Cash Balance

Endpoint untuk mengupdate nilai kas dan mencatat history transaksi.

- Method: `PUT`
- URL: `/api/finance/cash-balance`
- Autentikasi: menggunakan cookie `token` (diatur oleh service core). Pada contoh curl tidak disertakan cookie.

Body request:

- `status` (boolean)
  - `true`  → debit (kas bertambah)
  - `false` → kredit (kas berkurang)
- `value` (number) → nominal perubahan kas, wajib > 0
- `description` (string) → keterangan transaksi, wajib diisi

Contoh respons sukses:

```json
{
  "success": true,
  "message": "Cash balance updated successfully",
  "data": {
    "balance": 800.25
  }
}
```

Contoh curl (tanpa header cookie, silakan tambahkan sendiri di Postman):

```bash
curl -X PUT "http://localhost:3300/api/finance/cash-balance" \
  -H "Content-Type: application/json" \
  -d '{
    "status": true,
    "value": 1000.5,
    "description": "Initial cash"
  }'
```
Catatan tambahan: data `created_by_user` diambil dari service eksternal dengan endpoint berikut (contoh tanpa cookie):

```bash
curl --location 'http://localhost:3000/api/app-management/user/get-details?ids=1,2,3' \
  --header 'Accept: application/json'
```
