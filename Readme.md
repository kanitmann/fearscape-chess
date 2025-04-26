Key Technical Decisions

- Frontend State Management: Zustand over Redux for simplicity and performance
- Real-time Communication: Socket.IO for WebSocket support with fallbacks
- Authentication: JWT with refresh tokens + OAuth providers
- Game Logic: Chess.js for core rules + custom fog-of-war implementation
- Database: MongoDB for flexibility with game state documents

```fearscape-chess/
├── client/                      # Frontend React application
│   ├── public/                  # Static assets
│   └── src/
│       ├── assets/              # Images, sounds, etc.
│       ├── components/          # Reusable UI components
│       ├── features/            # Feature-specific components and logic
│       │   ├── auth/            # Authentication related components
│       │   ├── board/           # Chess board components
│       │   ├── game/            # Game mechanics
│       │   ├── profile/         # User profile components
│       │   └── tournament/      # Tournament related components
│       ├── hooks/               # Custom React hooks
│       ├── services/            # API service clients
│       ├── store/               # Zustand state management
│       ├── utils/               # Utility functions
│       ├── App.tsx              # Main application component
│       └── index.tsx            # Entry point
├── server/                      # Backend Node.js/Express application
│   ├── src/
│   │   ├── config/              # Configuration files
│   │   ├── controllers/         # Route controllers
│   │   ├── middleware/          # Express middleware
│   │   ├── models/              # Database models
│   │   ├── routes/              # API routes
│   │   ├── services/            # Business logic
│   │   │   ├── auth/            # Authentication service
│   │   │   ├── game/            # Game service (rules, validation)
│   │   │   ├── matchmaking/     # Matchmaking service
│   │   │   └── user/            # User service
│   │   ├── socket/              # WebSocket handlers
│   │   ├── utils/               # Utility functions
│   │   └── index.ts             # Entry point
│   └── tests/                   # Server tests
├── shared/                      # Shared code between client and server
│   ├── constants/               # Game constants
│   ├── types/                   # TypeScript type definitions
│   └── utils/                   # Shared utility functions
├── .gitignore                   # Git ignore file
├── docker-compose.yml           # Docker compose configuration
├── package.json                 # Root package.json for workspaces
├── README.md                    # Project documentation
└── tsconfig.json                # TypeScript configuration```