# kuikui

## Helloooo

This project is an anonymous real-time collaboration tool designed to allow
users to create and join shared workspaces without requiring authentication or
account creation. A user can create a collaboration room by entering a custom
name, and the system generates a unique shareable link. Others can join
instantly through the link and participate in real-time collaboration.

The tool leverages Node.js and WebSocket technology to provide seamless
real-time synchronization across multiple clients. It focuses on simplicity and
usability: no sign-ups, no passwords—just instant access.

The main use cases include:

- Quick brainstorming sessions

- Temporary collaboration in meetings

- Lightweight teamwork without administrative overhead

- Real-time note-taking or shared editing

The project will be developed with agile practices in mind, simulating
enterprise workflows (sprints, stories, and tasks). It will include a front-end
interface for creating/joining rooms, a back-end server for room and session
management, and support for real-time updates.

Future enhancements may include optional persistence, role management, and
integrations with third-party services.

## Demo

### 1. Initial Home Page

![Initial Home Page](https://private-user-images.githubusercontent.com/69280552/517788747-610c6704-f9c2-4440-87ac-d8a3891d55b4.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NjM4Njc4NDYsIm5iZiI6MTc2Mzg2NzU0NiwicGF0aCI6Ii82OTI4MDU1Mi81MTc3ODg3NDctNjEwYzY3MDQtZjljMi00NDQwLTg3YWMtZDhhMzg5MWQ1NWI0LnBuZz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNTExMjMlMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjUxMTIzVDAzMTIyNlomWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPWUxNzYwOGU1MzM4NWQ4NWZkYzc1NTVjMDQxNzZiMmEwZDY2YjQzMzFiZjE1MjM1OGQ0ZWNhZTQ3ZDAzZmEwNzUmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0.HtuX5XQIpW-UtE3bFQD4224C3gs7F9G1kZcA7EdpUE0)

### 2. Create a Room

![Create a Room](https://private-user-images.githubusercontent.com/69280552/517788709-0c8d8a19-6ac1-4e77-a8af-afe3c8e05064.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NjM4NjgwODksIm5iZiI6MTc2Mzg2Nzc4OSwicGF0aCI6Ii82OTI4MDU1Mi81MTc3ODg3MDktMGM4ZDhhMTktNmFjMS00ZTc3LWE4YWYtYWZlM2M4ZTA1MDY0LnBuZz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNTExMjMlMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjUxMTIzVDAzMTYyOVomWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPTNjYTY4Y2MzZGI2N2ViOTljZDJkYzFlNGRiYzYwYTM5NmNmY2I0OTZhMGQ1MmVkNGE5ZDgzMjgzYjFjODVjMzgmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0.SSxv_TcPr9KC4twGw5Pcv20aaCV6WWabDMr_El2buqg)

### 3. Send & Receive Message

![Send Message](https://private-user-images.githubusercontent.com/69280552/517788725-6f39c96c-57f9-45d8-b749-a5661cdd722e.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NjM4NjgwODksIm5iZiI6MTc2Mzg2Nzc4OSwicGF0aCI6Ii82OTI4MDU1Mi81MTc3ODg3MjUtNmYzOWM5NmMtNTdmOS00NWQ4LWI3NDktYTU2NjFjZGQ3MjJlLnBuZz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNTExMjMlMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjUxMTIzVDAzMTYyOVomWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPWVlODBkNDBkZTRhNzViN2NhNDlhZjE3ODgwNTBmMGJkMDliYTNjYWMwMzI1OTk2MDZkOGUyOTYzZDdhZTU0NWEmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0.VZndt4YCGknkW93og-9KoXUaFSPxv80dEblCA7NYbng)
![Receive Message](https://private-user-images.githubusercontent.com/69280552/517788771-8223f880-02d2-441f-b4db-593839f287f1.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NjM4NjgwODksIm5iZiI6MTc2Mzg2Nzc4OSwicGF0aCI6Ii82OTI4MDU1Mi81MTc3ODg3NzEtODIyM2Y4ODAtMDJkMi00NDFmLWI0ZGItNTkzODM5ZjI4N2YxLnBuZz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNTExMjMlMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjUxMTIzVDAzMTYyOVomWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPTU4OTc0MzQzNWVmNzZiNTIzMjY1M2MxMDBiYjQ2NzBmMWQwMDE5MTQxMTk3M2UxMDBlNWRhNTgzOGE4OTViNDUmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0.OdA5msUtxJGIAS8ih3Ft_yroX5YsEmWB5WAc8wZD3WM)

### 4. Editor Mode

![Editor Mode](https://private-user-images.githubusercontent.com/69280552/517788790-47c879cb-9c79-47d4-aa91-80f31b7a502e.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NjM4NjgwODksIm5iZiI6MTc2Mzg2Nzc4OSwicGF0aCI6Ii82OTI4MDU1Mi81MTc3ODg3OTAtNDdjODc5Y2ItOWM3OS00N2Q0LWFhOTEtODBmMzFiN2E1MDJlLnBuZz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNTExMjMlMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjUxMTIzVDAzMTYyOVomWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPTIxZjQxNGFkYjQzZWRiZmZlOGExMmNiZDUwMWJmODM1MThkMDliYmE2OGRhMjAzY2IwN2M4MDlmZDgyY2Q3YWEmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0.D22_-HfTXYwudw-ycmpEh84OrbilFeH2A6D3pRCgWWE)

### 5. Collaboration

![Collaboration](https://private-user-images.githubusercontent.com/69280552/517788786-5d3df428-d3ea-4ec9-ba32-e24135026ed4.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NjM4NjgwODksIm5iZiI6MTc2Mzg2Nzc4OSwicGF0aCI6Ii82OTI4MDU1Mi81MTc3ODg3ODYtNWQzZGY0MjgtZDNlYS00ZWM5LWJhMzItZTI0MTM1MDI2ZWQ0LnBuZz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNTExMjMlMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjUxMTIzVDAzMTYyOVomWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPWYxZmE0ZWFhMjY2NGI4ODliNTZhZGMyODM3ZmFhMTY3M2U0OWEyMWY4NGEwYzFjOGQ3YTdhNjdkMDdmNzFmOTgmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0.xUqVxw_IDrzOjSZ9Q33VzNX6qyEysIl66uKN4Yjy2q0)

## Test Coverage

We maintain high test coverage to ensure reliability.

### Backend

| Type       | Percentage |
| ---------- | ---------- |
| Statements | 92.93%     |
| Branches   | 85.62%     |
| Functions  | 91.11%     |
| Lines      | 92.93%     |

### Frontend

| Type       | Percentage |
| ---------- | ---------- |
| Statements | 76.58%     |
| Branches   | 83.79%     |
| Functions  | 71.05%     |
| Lines      | 76.58%     |

To run coverage reports:

```bash
npm run test:coverage
```

## Available Scripts

In the project directory, you can run:

### Development

- `npm run dev`: Starts the development environment (backend + frontend) with
  auto-cleanup and env setup.
- `npm run dev:backend`: Starts only the backend development server.
- `npm run dev:frontend`: Starts only the frontend development server.

### Testing

- `npm test`: Runs all tests.
- `npm run test:watch`: Runs backend tests in watch mode.
- `npm run test:ui`: Opens Vitest UI for frontend tests.
- `npm run test:coverage`: Generates coverage reports.

### Code Quality

- `npm run lint`: Lints the codebase.
- `npm run format`: Formats the codebase using Prettier.
- `npm run type-check`: Runs TypeScript type checking.

### Utilities

- `npm run env:setup`: Generates .env files from examples.
- `npm run port:cleanup`: Kills processes occupying development ports.
