# MyMusicPlayer

A complete standalone offline music player desktop application for macOS M1 (ARM64).

## Features

- **Music Library Management** — Import, organize, and browse your entire music collection
- **Audio Playback** — High-quality playback with HTML5 Audio API + Web Audio API
- **Equalizer** — 10-band graphic equalizer with presets (Flat, Rock, Pop, Jazz, Classical, Acoustic, Electronic)
- **Playlist Management** — Create, edit, and organize playlists
- **Favorites** — Quick access to your favorite tracks
- **Recently Played** — Track playback history
- **Dashboard** — Customizable dashboard with drag-and-drop widgets
- **Mini Player** — Compact floating player for quick control
- **Import System** — Drag-and-drop file import with folder scanning, duplicate detection, and metadata extraction
- **Backup & Restore** — Database backup and restore functionality
- **Settings** — Theme, accent colors, audio preferences, and more
- **Offline-First** — No cloud services, no ads, no subscriptions. Everything runs locally.

## Technology Stack

- **Electron 31.2.0** — Cross-platform desktop framework
- **React 18.3.1** — UI component library
- **Vite 5.4.0** — Build tool with code splitting
- **Tailwind CSS 3.4.0** — Styling with custom dark theme
- **better-sqlite3 11.3.0** — Local SQLite database
- **music-metadata 12.3.4** — ID3 tag extraction and artwork
- **Zustand 4.5.2** — Lightweight state management
- **@dnd-kit** — Drag-and-drop dashboard widgets

## Security Architecture

- **Context Isolation** — `contextIsolation: true` prevents renderer from accessing Node.js APIs directly
- **Node Integration Disabled** — `nodeIntegration: false` ensures no direct Node.js access from renderer
- **Sandbox Enabled** — `sandbox: true` for renderer processes
- **IPC Channel Validation** — All IPC channels are validated through contextBridge
- **No Cloud Services** — Everything runs locally, no data leaves your machine

## Installation

### Prerequisites

- Node.js 20.0.0 or higher
- macOS with Apple Silicon (M1/M2/M3)

### Development

```bash
# Install dependencies
npm install

# Start development mode (Vite + Electron)
npm run electron:dev

# Build for production
npm run build
```

### Building for Distribution

```bash
# Build ARM64 DMG for macOS
npm run electron:build:arm64

# Build Universal binary
npm run electron:build:universal
```

The DMG installer will be generated in the `dist-electron` directory.

## Project Structure

```
MyMusicPlayer/
├── electron/
│   ├── main.js              # Electron main process
│   ├── preload.js           # Secure contextBridge
│   ├── database/            # Database service and migrations
│   ├── ipc/                 # IPC handler registration
│   └── services/            # File, metadata, backup, scanner services
├── src/
│   ├── components/          # Reusable UI components
│   ├── context/             # React context (PlayerContext)
│   ├── pages/               # Application pages
│   ├── store/               # Zustand state stores
│   ├── styles/              # Global CSS
│   └── utils/               # Utility functions
└── build-resources/         # App icons and entitlements
```

## Usage

### Importing Music

1. Click the **Import** button or navigate to the Import page
2. Drag and drop music files or folders
3. Select import options (duplicate handling)
4. Click **Import** to add to your library

### Playing Music

1. Browse your library by Songs, Albums, Artists, Genres, or Playlists
2. Click any track to play it
3. Use the player controls at the bottom for play/pause, skip, seek, volume, shuffle, and repeat
4. Use the Equalizer page to adjust audio settings

### Dashboard Customization

1. Navigate to the Dashboard Builder
2. Drag widgets to reorder them
3. Remove unwanted widgets
4. Save your custom layout

## Database

The application uses SQLite for local data storage. The database is stored at:
`~/Library/Application Support/MyMusicPlayer/mymusicplayer.db`

All user music files remain untouched — the application only reads file paths and metadata, never copies, moves, or deletes your original files.

## License

Copyright © 2024 MyMusicPlayer. All rights reserved.