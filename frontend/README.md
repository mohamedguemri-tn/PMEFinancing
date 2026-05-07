# SME Financing Platform - Frontend

Angular 17 standalone components-based frontend application for the blockchain-based SME financing platform.

## Features

- **Angular 17** with standalone components
- **Angular Material** UI components
- **Responsive Design** for all devices
- **Standalone Services** for API communication
- **Routing** with lazy loading support
- **Forms** with reactive patterns

## Project Structure

```
frontend/
├── src/
│   ├── app/                 # Application components
│   ├── assets/              # Static assets
│   ├── environments/        # Environment configurations
│   ├── styles.scss          # Global styles
│   ├── main.ts              # Application entry point
│   └── index.html           # HTML template
├── angular.json             # Angular CLI configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies
```

## Installation

```bash
cd frontend
npm install
```

## Development

```bash
npm start
# or
ng serve
```

Navigate to `http://localhost:4200/`

## Build

```bash
npm run build
```

## Testing

```bash
npm test
```

## Dependencies

- **@angular/material**: Material Design components
- **RxJS**: Reactive programming library
- **TypeScript 5.2**: Language and tooling

## Configuration

Environment-specific configurations are in `src/environments/`. Update these with your backend API endpoints.
