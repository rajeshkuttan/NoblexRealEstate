# Emirates Lease Flow - Real Estate Management System

A comprehensive real estate management system designed for UAE property management, featuring lease management, tenant tracking, financial reporting, and Ejari compliance.

## Features

- **Property Management**: Complete property portfolio management
- **Tenant Management**: Tenant information, lease history, and communication tracking
- **Lease Management**: Automated lease workflows and renewal tracking
- **Financial Management**: Revenue tracking, expense management, and financial reporting
- **Reports & Analytics**: Comprehensive reporting and dashboard analytics
- **Settings & Configuration**: System settings and user management

## Technologies Used

- **Frontend**: React 18 with TypeScript
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM
- **State Management**: TanStack Query
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts for data visualization
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/rajeshkuttan/emirates-lease-flow.git
cd emirates-lease-flow
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:8080`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build for development
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── layout/         # Layout components
│   └── dashboard/       # Dashboard-specific components
├── pages/              # Page components
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and configurations
└── main.tsx           # Application entry point
```

## Key Pages

- **Dashboard**: Overview of properties, tenants, and financial metrics
- **Properties**: Property management and portfolio overview
- **Tenants**: Tenant information and lease management
- **Leases**: Lease agreements and renewal tracking
- **Finance**: Financial management and reporting
- **Reports**: Analytics and reporting dashboard
- **Settings**: System configuration and user management

## Development

This project uses modern React patterns with TypeScript for type safety. The UI is built with shadcn/ui components and styled with Tailwind CSS.

### Code Quality

- ESLint for code linting
- TypeScript for type checking
- Prettier for code formatting (recommended)

## Deployment

The application can be deployed to any static hosting service:

1. Build the application: `npm run build`
2. Deploy the `dist` folder to your hosting service

## License

This project is proprietary software. All rights reserved.

## Support

For support and questions, please contact the development team.