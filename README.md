# Smart Closet

An AI-powered smart wardrobe management app with virtual try-on, outfit recommendations, and wear tracking. Full-stack application with a React Native mobile frontend and Node.js/Express backend.

## Features

- **Virtual try-on** — Try clothes on your avatar using IDM-VTON via Hugging Face Spaces with SSE streaming
- **Outfit recommendations** — AI-generated outfit suggestions based on your wardrobe, body profile, and wear history
- **Wardrobe management** — Catalog clothing items with photos, categories, colors, and metadata
- **Wear tracking** — Log outfits worn and view history
- **Body profile** — Upload body photos for personalized avatar and fit recommendations
- **User authentication** — Secure registration and login with JWT

## Tech Stack

### Mobile (React Native)
- React Native + TypeScript
- Zustand (state management)
- React Navigation

### Server (Node.js)
- Express + TypeScript
- Prisma ORM + PostgreSQL
- JWT authentication
- Multer (image uploads)
- Hugging Face Spaces API (virtual try-on)

## Project Structure

```
mobile/                  # React Native mobile app
├── src/
│   ├── screens/         # App screens (Closet, Outfits, Avatar, Profile, etc.)
│   ├── components/      # Reusable components (TryOnModal, BodyProfileCard)
│   ├── services/        # API client and service modules
│   ├── stores/          # Zustand state stores
│   └── navigation/      # React Navigation setup
server/                  # Express backend
├── prisma/              # Database schema and migrations
├── src/
│   ├── controllers/     # Route handlers
│   ├── routes/          # Express route definitions
│   ├── services/        # Business logic (recommendations, try-on, images)
│   ├── middleware/       # Auth, upload, validation
│   └── utils/           # JWT, password hashing, Prisma client
```

## Getting Started

### Server
```bash
cd server
npm install
npx prisma migrate dev
npm run dev
```

### Mobile
```bash
cd mobile
npm install
npx expo start
```

## License

MIT
