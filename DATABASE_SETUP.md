# GI Registration Database Setup

This guide will help you set up the MySQL database for the GI Registration application.

## Prerequisites

- MySQL Server (5.7 or higher)
- Node.js (16 or higher)
- npm or yarn

## Quick Setup

### 1. Environment Configuration

Copy the environment template:

```bash
cp .env.example .env
```

Update the `.env` file with your MySQL credentials:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=gi_registration

# JWT Secret (change this in production)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Configuration
PORT=3001
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Database

Run the automated setup script:

```bash
npm run setup:db
```

This script will:

- Create the `gi_registration` database
- Create all necessary tables
- Insert default product categories and products
- Create a default admin user (username: `admin`, password: `admin123`)

### 4. Start the Application

```bash
npm run dev
```

The application will be available at http://localhost:5173

## Database Schema

### Tables Overview

1. **users** - User accounts for authentication
2. **product_categories** - Categories like "Textile Products", "Food Products"
3. **products** - Individual products like "Bodo Dokhona", "Bodo Aronai"
4. **user_registrations** - Main registration data for each user
5. **user_documents** - File uploads (documents, photos)
6. **user_existing_products** - Products the user already produces
7. **user_selected_products** - Products the user wants to produce

### Default Data

The setup includes:

**Product Categories:**

- Agriculture Products
- Beverage Products
- Food Products
- Musical Instrument Products
- Textile Products

**Products:**

- Gonggwna
- Bodo Sifung
- Bodo Serza / Bodo Serja
- Bodo Kham
- Bodo Jotha
- Bodo Thorka
- Bodo Dokhona
- Bodo Aronai
- Bodo Gamsa
- Bodo Gongar Dunja
- Bodo Keradapini

## API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/verify` - Verify JWT token

### Products

- `GET /api/products/categories` - Get all product categories
- `GET /api/products` - Get all products (optional: filter by category_id)
- `GET /api/products/existing` - Get products with registration counts
- `GET /api/products/statistics` - Get dashboard statistics

### Registrations

- `POST /api/registrations` - Create new registration (protected)
- `GET /api/registrations/user` - Get user's registrations (protected)
- `GET /api/registrations/all` - Get all registrations (admin)

## Login Credentials

**Default Admin Account:**

- Username: `admin`
- Password: `admin123`

⚠️ **Important:** Change the default password in production!

## Troubleshooting

### Common Issues

1. **Database Connection Failed**

   - Verify MySQL is running
   - Check credentials in `.env` file
   - Ensure the MySQL user has CREATE database privileges

2. **Permission Denied**

   - Grant privileges: `GRANT ALL PRIVILEGES ON *.* TO 'your_user'@'localhost';`
   - Flush privileges: `FLUSH PRIVILEGES;`

3. **Port Already in Use**
   - Change the PORT in `.env` file
   - Kill existing processes: `lsof -ti:3001 | xargs kill`

### Manual Database Setup

If the automated setup fails, you can manually create the database:

```sql
-- Connect to MySQL as root
mysql -u root -p

-- Create database
CREATE DATABASE gi_registration;

-- Create user (optional)
CREATE USER 'gi_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON gi_registration.* TO 'gi_user'@'localhost';
FLUSH PRIVILEGES;
```

Then run the application - it will automatically create the tables.

## Production Deployment

For production deployment:

1. **Secure Environment Variables:**

   ```env
   JWT_SECRET=generate-a-strong-random-secret-key
   DB_PASSWORD=strong-database-password
   ```

2. **Database Security:**

   - Create a dedicated database user with minimal privileges
   - Use SSL connections
   - Regular backups

3. **File Uploads:**
   - Configure proper file storage (AWS S3, etc.)
   - Set up file size limits
   - Implement virus scanning

## Data Management

### Backup Database

```bash
mysqldump -u root -p gi_registration > backup.sql
```

### Restore Database

```bash
mysql -u root -p gi_registration < backup.sql
```

### Reset Database

```bash
npm run setup:db
```

## Support

If you encounter issues:

1. Check the console logs for error messages
2. Verify your database connection settings
3. Ensure all dependencies are installed
4. Check the troubleshooting section above

For additional help, please refer to the main application documentation.
