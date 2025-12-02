# Archival Testing - Quick Start

## 🚀 5-Minute Test

### 1. Seed Database
```bash
npm run seed
```
**Save the company API key** from the output!

### 2. Run Archival Job
```bash
npx tsx src/crons/archivalJob.ts
```
You should see: `✅ Archived 30 events`

### 3. Test in Postman

**Request**: `GET http://localhost:4040/v1/key/company/export-archive.json`

**Headers**:
```
x-hyrelog-key: YOUR_COMPANY_KEY_FROM_SEED
```

**Expected**: JSON array with archived events

---

## 📋 Full Step-by-Step Guide

See [ARCHIVAL_TESTING_GUIDE.md](./ARCHIVAL_TESTING_GUIDE.md) for detailed instructions.

