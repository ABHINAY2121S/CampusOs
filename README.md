# Campus OS

**Campus OS** is a unified operating system for college campuses. Its hero feature is **AI-powered issue management**: a student types a complaint in plain natural language, and the system extracts category, location, and asset, detects duplicate reports via vector similarity search, computes a transparent priority score, and routes it to an admin/HOD for technician assignment and resolution tracking.

Secondary modules include:
- Notices & Circulars
- Campus Events & RSVPs
- Lost & Found
- Campus Services
- Scholarships & Government Schemes
- Campus AI Interactive Assistant

---

## Architecture

- **Frontend**: React 18, TypeScript, Vite, Vanilla CSS design tokens with rich light/dark themes and responsive mobile/desktop layouts.
- **Backend API**: Node.js, Express, TypeScript, Prisma ORM, Socket.IO real-time events, JWT auth with RBAC (`student`, `admin`, `hod`, `technician`).
- **Database**: PostgreSQL 16 with `pgvector` extension for semantic embedding storage and fast vector similarity search.
- **NLP Service**: FastAPI (Python), sentence-transformers for text embeddings and entity/intent classification.

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- Docker & Docker Compose (optional, for full containerized stack)
- PostgreSQL 16 with pgvector

### Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### Running with Docker Compose
```bash
docker compose up --build
```

### Running Locally

1. **Backend**:
   ```bash
   cd backend
   npm install
   npx prisma migrate dev
   npm run seed
   npm run dev
   ```

2. **Frontend**:
   ```bash
   cd "Campus OS SaaS Web App"
   npm install
   npm run dev
   ```

3. **NLP Service**:
   ```bash
   cd nlp-service
   pip install -r requirements.txt
   uvicorn main:app --reload --port 8000
   ```

---

## License
MIT
