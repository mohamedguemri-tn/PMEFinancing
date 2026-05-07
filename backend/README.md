# SME Financing Platform - Backend

ASP.NET Core 8 Web API with Clean Architecture for blockchain-based SME financing platform.

## Architecture

The project follows Clean Architecture with the following layers:

```
backend/
├── src/
│   ├── Api/                    # Presentation layer (Controllers, Program.cs)
│   ├── Application/             # Application services layer
│   ├── Domain/                 # Domain layer (Entities, Business Logic)
│   └── Infrastructure/          # Infrastructure layer (DbContext, Repositories)
└── scripts/                     # Database scripts
```

## Features

- **ASP.NET Core 8** Web API
- **Entity Framework Core 8** with SQL Server
- **Clean Architecture** design pattern
- **Swagger/OpenAPI** documentation
- **CORS** enabled for frontend communication
- **SQL Server** database support

## Prerequisites

- .NET 8 SDK
- SQL Server 2019 or higher (or SQL Server Express)
- Visual Studio 2022 / VS Code

## Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Restore NuGet packages:
```bash
dotnet restore
```

3. Update the database:
```bash
dotnet ef database update
```

## Running the Application

```bash
cd src/Api
dotnet run
```

The API will be available at: `https://localhost:5001/api`

Swagger documentation: `https://localhost:5001/swagger`

## Database Configuration

Connection string is configured in `src/Api/appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=SmeFinancingDb;Trusted_Connection=true;"
  }
}
```

### Creating and Seeding the Database

The initial database schema and seed data can be found in `scripts/init-db.sql`.

Run EF Core migrations:
```bash
dotnet ef database update -s src/Api -p src/Infrastructure
```

## Project Structure

### Domain Layer
- **Entities**: SME, FinancingRequest
- **Common**: BaseEntity

### Infrastructure Layer
- **Persistence**: AppDbContext, Entity configurations

### Application Layer
- Use Cases/Services (to be implemented)

### Api Layer
- **Controllers**: REST API endpoints
- **Program.cs**: Dependency injection and middleware configuration

## Technologies Used

- **Language**: C# 12
- **Framework**: ASP.NET Core 8
- **ORM**: Entity Framework Core 8
- **Database**: SQL Server
- **API Documentation**: Swagger/OpenAPI
