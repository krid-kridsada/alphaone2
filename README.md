# AlphaOne React

โปรเจกต์นี้แปลงจาก `alphaone.html` มาเป็นโครงสร้าง React + Vite พร้อม Tailwind และไฟล์ deploy สำหรับ Vercel/Netlify

## Run local

```bash
npm install
npm run dev
```

## Build production

```bash
npm run build
npm run preview
```

## Environment Variables

คัดลอกไฟล์ `.env.example` เป็น `.env` แล้วแก้ค่าตามระบบจริง

```bash
cp .env.example .env
```

- `VITE_APP_ID` - app id สำหรับ path ใน Firestore
- `VITE_INITIAL_AUTH_TOKEN` - custom auth token (ถ้าไม่ใส่ จะใช้ anonymous sign-in)
- `VITE_FIREBASE_CONFIG` - JSON string ของ firebase config

ตัวอย่าง:

```env
VITE_APP_ID=my-app
VITE_INITIAL_AUTH_TOKEN=
VITE_FIREBASE_CONFIG={"apiKey":"...","authDomain":"...","projectId":"...","storageBucket":"...","messagingSenderId":"...","appId":"..."}
```

## Deploy

### Vercel

1. Push ขึ้น GitHub
2. Import โปรเจกต์ใน Vercel
3. ตั้ง Environment Variables ตาม `.env.example`
4. Deploy ได้ทันที (มี `vercel.json` รองรับ SPA route แล้ว)

### Netlify

1. Push ขึ้น GitHub
2. New site from Git
3. Build command: `npm run build`
4. Publish directory: `dist`
5. ตั้ง Environment Variables ตาม `.env.example`
6. Deploy ได้ทันที (มี `netlify.toml` รองรับ SPA route แล้ว)
