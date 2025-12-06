# Membership Dues API

## Finance

## Upload Proof File
Update bukti bayar untuk iuran anggota. Endpoint ini menerima `id` dari membership dues pada path. Body hanya berisi `status_file` dan `proof_file`.

**URL** : `/api/finance/dues/{id}/proof`

**Method** : `PUT`

**Auth required** : YES

**Content-Type** : `multipart/form-data`

**Path Params** :
- `id` (number) → ID dari membership dues

**Body** :
| Key | Type | Required | Description |
| --- | --- | --- | --- |
| status_file | number | YES | 0: tidak ubah file; 1: ganti/hapus file |
| proof_file | file | CONDITIONAL | Bukti bayar (image/pdf). Wajib jika ingin mengganti file |

Catatan:
- Jika `status_file = 0`, tidak ada perubahan file, abaikan `proof_file`.
- Jika `status_file = 1` dan ada `proof_file`, maka file bukti akan diganti.
- Jika `status_file = 1` dan tidak ada `proof_file`, maka file bukti akan dihapus.

**Contoh Curl** (tanpa header cookie):
```bash
# Ganti file bukti
curl -X PUT "http://localhost:3300/api/finance/dues/123/proof" \
  -F "status_file=1" \
  -F "proof_file=@/path/to/proof.jpg"

# Hapus file bukti
curl -X PUT "http://localhost:3300/api/finance/dues/123/proof" \
  -F "status_file=1"

# Tidak ada perubahan file
curl -X PUT "http://localhost:3300/api/finance/dues/123/proof" \
  -F "status_file=0"
```

**Success Response** :
```json
{
    "data": {
        "message": "Membership dues paid with proof",
        "path": "http://localhost:3300/storage/proof_file/1715673600000-proof.jpg"
    }
}
```

## Pay or Update Status
Mark membership dues as paid (without proof) or unpaid.

**URL** : `/api/finance/dues`

**Method** : `POST`

**Auth required** : YES

**Content-Type** : `application/json`

**Body** :
```json
{
    "member_id": 1,
    "period_year": 2024,
    "period_month": 5,
    "status": "paid" 
}
```
*Note: `status` can be "paid" or "unpaid".*
*If `status` is set to "unpaid", the payment record and any associated proof file will be DELETED.*

**Success Response** :
```json
{
    "data": {
        "message": "Membership dues marked as paid",
        "amount": 50000
    }
}
```

---

# GET List Membership Dues

Endpoint untuk mendapatkan daftar iuran anggota dengan pagination, search, dan filter.

- Method: `GET`
- URL: `/api/finance/dues`
- Autentikasi: menggunakan cookie `token` atau header `Authorization`.

Query Parameters:

- `page` (number, optional) → Halaman (default: 1)
- `limit` (number, optional) → Jumlah data per halaman (default: 10)
- `period_year` (number, optional) → Filter tahun (default: tahun sekarang)
- `search` (string, optional) → Pencarian berdasarkan nama anggota atau member_id
- `cursor` (number, optional) → ID terakhir untuk pagination (load more)

Response:

```json
{
  "data": [
    {
      "id": 1,
      "member_id": 101,
      "member_name": "John Doe",
      "period_year": 2025,
      "period_month": 1,
      "amount": 50000,
      "status": "paid",
      "paid_at": "2025-01-01T10:00:00Z",
      "proof_file_path": "storage/proof_file/filename.jpg"
    }
  ],
  "paging": {
    "page": 1,
    "total_page": 5,
    "total_item": 50
  }
}
```

Contoh curl:

```bash
curl -X GET "http://localhost:3300/api/finance/dues?page=1&limit=10&period_year=2025" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

# POST Pay Membership Dues

Endpoint untuk mencatat pembayaran atau pembatalan iuran anggota.
Jika status diubah menjadi `unpaid`, sistem akan otomatis menghapus file bukti bayar yang tersimpan di server (jika ada).

- Method: `POST`
- URL: `/api/finance/dues`
- Autentikasi: menggunakan cookie `token`.
- Content-Type: `application/json`

Body Request:

- `member_id` (number) → ID anggota
- `period_year` (number) → Tahun periode
- `period_month` (number) → Bulan periode (1-12)
- `status` (string) → 'paid' atau 'unpaid'
- `proof_file_path` (string, optional) → Path file bukti bayar (didapat dari endpoint upload)

Contoh curl (Bayar dengan path file dari upload):

```bash
curl -X POST "http://localhost:3300/api/finance/dues" \
  -H "Content-Type: application/json" \
  -d '{
    "member_id": 1,
    "period_year": 2025,
    "period_month": 1,
    "status": "paid",
    "proof_file_path": "storage/proof_file/filename.jpg"
  }'
```

Contoh curl (Batal/Unpaid):

```bash
curl -X POST "http://localhost:3300/api/finance/dues" \
  -H "Content-Type: application/json" \
  -d '{
    "member_id": 1,
    "period_year": 2025,
    "period_month": 1,
    "status": "unpaid"
  }'
```

---

## GET Detail Membership Dues

Mengambil detail iuran anggota berdasarkan Membership Dues ID, beserta informasi member terkait.

- Method: `GET`
- URL: `/api/finance/dues/{id}`
- Autentikasi: menggunakan cookie `token` (route dilindungi, namun contoh curl tanpa header cookie sesuai aturan docs)

Path Params:

- `id` (number) → ID dari membership dues

Response contoh:

```json
{
  "success": true,
  "data": {
    "membership_dues": {
      "id": 1,
      "member_id": 123,
      "amount": 100000,
      "status": "paid",
      "due_date": "2024-06-01T00:00:00.000Z",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z",
      "proof_file_path": "http://localhost:3300/storage/proof_file/1715673600000-proof.jpg"
    },
    "member": {
      "id": 123,
      "name": "John Doe",
      "username": "johndoe",
      "gender": "Male",
      "birthdate": "1990-01-01T00:00:00.000Z",
      "address": "Jl. Contoh No. 123, Jakarta",
      "phone": "081234567890",
      "photo": "http://localhost:3200/storage/images/members/photo-1234567890.jpg",
      "active": true
    }
  },
  "message": "Membership dues detail retrieved successfully"
}
```

Contoh curl (tanpa cookie header):

```bash
curl -X GET "http://localhost:3300/api/finance/dues/1"
```
