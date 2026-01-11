# Backend Implementation Guide - Emirates Lease Flow

## 🎯 **Project Overview**
Complete backend implementation for Emirates Lease Flow - UAE Real Estate Lease Management System with MySQL database integration.

## 📋 **Implementation Checklist**

### ✅ **Phase 1: Backend Setup - COMPLETED**
- [x] Set up Node.js/Express backend server
- [x] Create MySQL database schema and tables
- [x] Set up database connection and models
- [x] Create API endpoints for leads management
- [x] Migrate mock data to database
- [x] Update frontend to use API endpoints (in progress)
- [x] Add authentication and middleware
- [x] Test complete backend integration

## 🗄️ **Database Schema**

### **Database Configuration**
```sql
Server: localhost
Port: 3306
Database: Leasemanagement
Username: root
Password: (empty)
```

### **Tables Structure**

#### **1. Users Table**
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'agent', 'manager') DEFAULT 'agent',
  phone VARCHAR(20),
  avatar VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### **2. Leads Table**
```sql
CREATE TABLE leads (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  company VARCHAR(255),
  position VARCHAR(255),
  
  -- UAE Specific Fields
  emirates_id VARCHAR(20),
  visa_status ENUM('resident', 'tourist', 'investor', 'student', 'other'),
  nationality VARCHAR(100),
  trade_license VARCHAR(50),
  company_type ENUM('llc', 'freezone', 'branch', 'representative', 'other'),
  bank_name VARCHAR(100),
  salary_certificate BOOLEAN DEFAULT false,
  
  -- Property Preferences
  emirate ENUM('dubai', 'abu_dhabi', 'sharjah', 'ajman', 'ras_al_khaimah', 'fujairah', 'umm_al_quwain'),
  community VARCHAR(100),
  building_type ENUM('apartment', 'villa', 'townhouse', 'penthouse', 'duplex', 'studio', 'office', 'retail', 'warehouse'),
  furnished ENUM('furnished', 'semi_furnished', 'unfurnished'),
  bedrooms INT,
  bathrooms INT,
  area DECIMAL(10,2),
  budget DECIMAL(15,2),
  move_in_date DATE,
  
  -- Lead Management
  status ENUM('new', 'contacted', 'qualified', 'viewing', 'negotiation', 'proposal', 'closed_won', 'closed_lost') DEFAULT 'new',
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
  source ENUM('website', 'referral', 'walk_in', 'social_media', 'advertisement', 'other') DEFAULT 'website',
  lead_score INT DEFAULT 0,
  assigned_to INT,
  
  -- Compliance
  compliance_status ENUM('pending', 'verified', 'rejected', 'under_review') DEFAULT 'pending',
  kyc_status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
  anti_money_laundering BOOLEAN DEFAULT false,
  
  -- Additional Info
  requirements TEXT,
  notes TEXT,
  tags JSON,
  documents JSON,
  
  -- Timestamps
  last_contact_date TIMESTAMP NULL,
  next_follow_up TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (assigned_to) REFERENCES users(id)
);
```

#### **3. Properties Table**
```sql
CREATE TABLE properties (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  emirate ENUM('dubai', 'abu_dhabi', 'sharjah', 'ajman', 'ras_al_khaimah', 'fujairah', 'umm_al_quwain'),
  community VARCHAR(100),
  building_type ENUM('apartment', 'villa', 'townhouse', 'penthouse', 'duplex', 'studio', 'office', 'retail', 'warehouse'),
  bedrooms INT,
  bathrooms INT,
  area DECIMAL(10,2),
  price DECIMAL(15,2),
  price_per_sqft DECIMAL(10,2),
  furnished ENUM('furnished', 'semi_furnished', 'unfurnished'),
  amenities JSON,
  features JSON,
  images JSON,
  availability ENUM('available', 'rented', 'sold', 'maintenance') DEFAULT 'available',
  move_in_date DATE,
  agent_id INT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (agent_id) REFERENCES users(id)
);
```

#### **4. Lead Properties (Matching) Table**
```sql
CREATE TABLE lead_properties (
  id INT PRIMARY KEY AUTO_INCREMENT,
  lead_id INT NOT NULL,
  property_id INT NOT NULL,
  match_score INT DEFAULT 0,
  is_favorite BOOLEAN DEFAULT false,
  viewed_at TIMESTAMP NULL,
  contacted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  UNIQUE KEY unique_lead_property (lead_id, property_id)
);
```

#### **5. Lead Activities Table**
```sql
CREATE TABLE lead_activities (
  id INT PRIMARY KEY AUTO_INCREMENT,
  lead_id INT NOT NULL,
  user_id INT NOT NULL,
  activity_type ENUM('call', 'email', 'whatsapp', 'meeting', 'viewing', 'proposal', 'follow_up', 'note') NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## 🚀 **API Endpoints**

### **Authentication**
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### **Leads Management**
- `GET /api/leads` - Get all leads with filters
- `GET /api/leads/:id` - Get single lead
- `POST /api/leads` - Create new lead
- `PUT /api/leads/:id` - Update lead
- `DELETE /api/leads/:id` - Delete lead
- `POST /api/leads/:id/score` - Update lead score
- `POST /api/leads/:id/activities` - Add lead activity

### **Properties Management**
- `GET /api/properties` - Get all properties
- `GET /api/properties/:id` - Get single property
- `POST /api/properties` - Create new property
- `PUT /api/properties/:id` - Update property
- `DELETE /api/properties/:id` - Delete property

### **Property Matching**
- `GET /api/leads/:id/matches` - Get property matches for lead
- `POST /api/leads/:id/matches/:propertyId` - Add property to favorites
- `DELETE /api/leads/:id/matches/:propertyId` - Remove from favorites

### **Analytics**
- `GET /api/analytics/leads` - Lead analytics
- `GET /api/analytics/conversion` - Conversion analytics
- `GET /api/analytics/performance` - Performance metrics

## 🔧 **Technology Stack**

### **Backend**
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MySQL2** - Database driver
- **Sequelize** - ORM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **cors** - Cross-origin requests
- **helmet** - Security headers
- **express-rate-limit** - Rate limiting

### **Database**
- **MySQL 8.0+** - Primary database
- **Connection Pooling** - Performance optimization
- **Indexes** - Query optimization

## 📁 **Project Structure**

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   └── config.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── leadController.js
│   │   ├── propertyController.js
│   │   └── analyticsController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── validation.js
│   │   └── errorHandler.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Lead.js
│   │   ├── Property.js
│   │   ├── LeadProperty.js
│   │   └── LeadActivity.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── leads.js
│   │   ├── properties.js
│   │   └── analytics.js
│   ├── services/
│   │   ├── leadService.js
│   │   ├── propertyService.js
│   │   └── matchingService.js
│   ├── utils/
│   │   ├── helpers.js
│   │   └── validators.js
│   └── app.js
├── package.json
├── .env
└── README.md
```

## 🔐 **Security Features**

- **JWT Authentication** - Secure token-based auth
- **Password Hashing** - bcryptjs encryption
- **Input Validation** - Joi/express-validator
- **SQL Injection Protection** - Parameterized queries
- **CORS Configuration** - Cross-origin security
- **Rate Limiting** - API abuse prevention
- **Helmet** - Security headers

## 📊 **Performance Optimizations**

- **Database Indexing** - Query optimization
- **Connection Pooling** - Resource management
- **Caching** - Redis integration (future)
- **Pagination** - Large dataset handling
- **Compression** - Response optimization

## 🧪 **Testing Strategy**

- **Unit Tests** - Individual function testing
- **Integration Tests** - API endpoint testing
- **Database Tests** - Data integrity testing
- **Performance Tests** - Load testing

## 📈 **Monitoring & Logging**

- **Winston** - Logging framework
- **Morgan** - HTTP request logging
- **Error Tracking** - Comprehensive error handling
- **Performance Metrics** - Response time monitoring

---

**Status**: 🚧 **In Progress** - Backend implementation ongoing
**Last Updated**: $(date)
**Next Phase**: Database setup and API development
