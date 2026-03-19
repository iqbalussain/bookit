# BookIt - Invoice Management System

A modern invoice and accounting management application built with React, TypeScript, and Electron.

## Features

- Customer and vendor management
- Invoice creation and management
- Purchase invoice tracking
- Payment processing
- Quotation management
- Chart of accounts
- Double-entry accounting
- Backup and restore functionality

## Database

The application uses SQLite as its database, stored as a single `.db` file that users can easily backup and restore.

## Development

### Prerequisites

- Node.js & npm
- For desktop app: Electron

### Installation

```sh
# Install dependencies
npm install

# Rebuild native modules for Electron
npx electron-rebuild
```

### Running the Application

#### Web Version (Development)
```sh
npm run dev
```

#### Desktop App (Development)
```sh
npm run electron-dev
```

#### Desktop App (Production)
```sh
npm run build
npm run electron
```

### Database Location

The SQLite database is stored at:
- Windows: `%APPDATA%\invoiceflow\invoiceflow.db`
- macOS: `~/Library/Application Support/invoiceflow/invoiceflow.db`
- Linux: `~/.config/invoiceflow/invoiceflow.db`

## Project Structure

- `src/` - React application source code
- `main.js` - Electron main process
- `preload.js` - Electron preload script for IPC
- `dist/` - Built application files

## Technologies Used

- React 18
- TypeScript
- Vite
- Electron
- SQLite3
- Tailwind CSS
- Radix UI Components
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
