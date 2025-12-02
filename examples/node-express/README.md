# HyreLog Express.js Example

Example Express.js application demonstrating HyreLog SDK integration.

## Features

- Automatic HTTP request/response logging
- Error tracking
- Slow request detection
- Custom event logging
- Schema validation examples

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env`:
```env
HYRELOG_WORKSPACE_KEY=your-workspace-key
HYRELOG_BASE_URL=http://localhost:4040
PORT=3000
```

3. Run the server:
```bash
npm run dev
```

## Usage

The example includes:
- Express middleware for automatic logging
- Custom event logging in routes
- Error handling with event tracking
- Rate limit simulation

Visit `http://localhost:3000` to see the example in action.

