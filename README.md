# SME Financing Platform

A comprehensive blockchain-based financing solution for Small and Medium Enterprises (SMEs), featuring a modern Angular frontend, robust ASP.NET Core backend, and smart contract infrastructure.

## 🏗️ Solution Architecture

This is a full-stack, multi-project solution with three main components:

### 1. **Frontend** (`/frontend`)
- **Technology**: Angular 17
- **Features**:
  - Standalone components architecture
  - Angular Material for UI
  - Responsive design
  - TypeScript strict mode enabled
  - Environment-based configuration

**Quick Start**:
```bash
cd frontend
npm install
npm start
```

See [frontend/README.md](frontend/README.md) for detailed documentation.

### 2. **Backend** (`/backend`)
- **Technology**: ASP.NET Core 8 Web API
- **Architecture**: Clean Architecture (Domain, Application, Infrastructure, Api layers)
- **Features**:
  - Entity Framework Core 8 with SQL Server
  - Swagger/OpenAPI documentation
  - CORS enabled
  - Structured logging
  - Database migrations support

**Quick Start**:
```bash
cd backend/src/Api
dotnet run
```

API available at: `https://localhost:5001/api`  
Swagger UI: `https://localhost:5001/swagger`

See [backend/README.md](backend/README.md) for detailed documentation.

### 3. **Smart Contracts** (`/contracts`)
- **Technology**: Solidity + Truffle
- **Features**:
  - FinancingToken (ERC20)
  - LoanPool contract
  - Multi-chain deployment support
  - OpenZeppelin contracts integration
  - Comprehensive test suite

**Quick Start**:
```bash
cd contracts
npm install
npm run compile
npm test
```

See [contracts/README.md](contracts/README.md) for detailed documentation.

## 📋 Project Structure

```
sme-financing-platform/
├── frontend/                          # Angular 17 application
│   ├── src/
│   │   ├── app/                       # Application components
│   │   ├── environments/              # Configuration files
│   │   └── assets/                    # Static files
│   ├── angular.json
│   ├── tsconfig.json
│   └── package.json
│
├── backend/                           # ASP.NET Core 8 API
│   ├── src/
│   │   ├── Api/                       # Presentation layer
│   │   ├── Application/               # Business logic layer
│   │   ├── Domain/                    # Domain entities
│   │   └── Infrastructure/            # Data access layer
│   ├── scripts/
│   │   └── init-db.sql                # Database initialization
│   └── README.md
│
├── contracts/                         # Solidity smart contracts
│   ├── contracts/                     # Contract source files
│   │   ├── FinancingToken.sol
│   │   └── LoanPool.sol
│   ├── migrations/                    # Deployment scripts
│   ├── test/                          # Test files
│   ├── truffle-config.js
│   └── package.json
│
├── .gitignore                         # Git ignore rules
└── README.md                          # This file
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **.NET 8 SDK**
- **SQL Server** 2019+ (or SQL Server Express)
- **Truffle CLI**: `npm install -g truffle`
- **Ganache CLI**: `npm install -g ganache-cli`

### Installation

1. **Clone the repository**:
```bash
git clone <repository-url>
cd code-mohamed
```

2. **Install Frontend**:
```bash
cd frontend
npm install
cd ..
```

3. **Restore Backend**:
```bash
cd backend
dotnet restore
cd ..
```

4. **Install Contracts**:
```bash
cd contracts
npm install
cd ..
```

### Configuration

#### Backend Database
Update `backend/src/Api/appsettings.json`:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=YOUR_SERVER;Database=SmeFinancingDb;Trusted_Connection=true;"
  }
}
```

#### Frontend API Endpoint
Update `frontend/src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5001/api'
};
```

#### Smart Contracts Network
Create `contracts/.env`:
```
MNEMONIC=your_wallet_mnemonic
INFURA_KEY=your_infura_key
```

## 📦 Development Workflow

### Running All Services

**Terminal 1 - Backend API**:
```bash
cd backend/src/Api
dotnet run
```

**Terminal 2 - Frontend Development Server**:
```bash
cd frontend
npm start
```

**Terminal 3 - Smart Contracts (Optional)**:
```bash
cd contracts
npm run ganache
# In another terminal
npm test
```

## 🧪 Testing

### Backend
```bash
cd backend
dotnet test
```

### Frontend
```bash
cd frontend
npm test
```

### Smart Contracts
```bash
cd contracts
npm test
```

## 🗄️ Database Setup

### Create Database
The backend includes Entity Framework Core migrations. Run:

```bash
cd backend/src/Api
dotnet ef database update -s . -p ../Infrastructure
```

Or manually execute `backend/scripts/init-db.sql` in SQL Server Management Studio.

## 🔐 Security Considerations

- Keep environment variables secure (use `.env` files, never commit secrets)
- Validate all user inputs on both frontend and backend
- Use HTTPS in production
- Implement proper authentication/authorization
- Regular security audits for smart contracts
- Keep dependencies updated

## 📄 Documentation

Each project contains detailed documentation:
- [Frontend Documentation](frontend/README.md)
- [Backend Documentation](backend/README.md)
- [Smart Contracts Documentation](contracts/README.md)

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Follow the project structure and coding standards
3. Test thoroughly before submitting changes
4. Create a pull request with clear description

## 📝 License

[Specify your license here]

## 📧 Support

For issues, questions, or suggestions, please reach out to the development team.

## 🗂️ Environment Setup

### Development Environment Variables

Create `.env` files in each project directory:

**Frontend** - `frontend/.env`
```
NG_APP_API_URL=http://localhost:5001/api
```

**Backend** - `backend/src/Api/.env` (optional, managed via appsettings)

**Contracts** - `contracts/.env`
```
MNEMONIC=your_wallet_seed_phrase
INFURA_KEY=your_infura_key
ETHERSCAN_API_KEY=your_etherscan_key
```

## 🎯 Key Features

✅ Modern Angular 17 with standalone components  
✅ Clean Architecture backend  
✅ Entity Framework Core with SQL Server  
✅ Solidity smart contracts with full test coverage  
✅ CORS-enabled API  
✅ Material Design UI  
✅ Multi-chain smart contract deployment  
✅ Comprehensive documentation  
✅ Database seeding and migrations  
✅ Swagger API documentation  

## 🔄 API Integration Points

### Frontend to Backend
- RESTful API calls via Angular HttpClient
- Base URL configured in `environment.ts`
- Endpoints: `/api/health`, `/api/smes`, `/api/financing-requests`

### Backend to Smart Contracts
- Via contract addresses stored in database
- Off-chain business logic in backend
- On-chain state in smart contracts

## 📊 Technology Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Angular | 17 |
| Frontend UI | Angular Material | 17 |
| Backend | ASP.NET Core | 8 |
| Backend ORM | Entity Framework Core | 8 |
| Database | SQL Server | 2019+ |
| Smart Contracts | Solidity | 0.8.19 |
| Contract Platform | Ethereum/BSC/etc | EVM-compatible |
| Package Manager | npm | Latest |

---

**Last Updated**: May 2026  
**Version**: 1.0.0
