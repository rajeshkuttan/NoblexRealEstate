/**
 * Migration Runner Script
 * Executes migration files in sequential order
 * Supports forward (up) and rollback (down) operations
 */

require('dotenv').config({ path: './config.env' });
const fs = require('fs');
const path = require('path');
const { sequelize } = require('../models');

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}═══ ${msg} ═══${colors.reset}`),
  migration: (msg) => console.log(`${colors.magenta}⇒${colors.reset} ${msg}`),
};

/**
 * Create migrations tracking table if it doesn't exist
 */
async function createMigrationsTable() {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    log.success('Migrations tracking table ready');
  } catch (error) {
    log.error(`Failed to create migrations table: ${error.message}`);
    throw error;
  }
}

/**
 * Get list of executed migrations
 */
async function getExecutedMigrations() {
  try {
    const [results] = await sequelize.query('SELECT name FROM migrations ORDER BY id ASC');
    return results.map(row => row.name);
  } catch (error) {
    log.error(`Failed to fetch executed migrations: ${error.message}`);
    return [];
  }
}

/**
 * Record migration execution
 */
async function recordMigration(name) {
  try {
    await sequelize.query('INSERT INTO migrations (name) VALUES (?)', {
      replacements: [name]
    });
  } catch (error) {
    log.error(`Failed to record migration ${name}: ${error.message}`);
    throw error;
  }
}

/**
 * Remove migration record (for rollback)
 */
async function removeMigration(name) {
  try {
    await sequelize.query('DELETE FROM migrations WHERE name = ?', {
      replacements: [name]
    });
  } catch (error) {
    log.error(`Failed to remove migration record ${name}: ${error.message}`);
    throw error;
  }
}

/**
 * Get all migration files sorted by name
 */
function getMigrationFiles() {
  const migrationsDir = path.join(__dirname, '../migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    log.warn('Migrations directory not found, creating...');
    fs.mkdirSync(migrationsDir, { recursive: true });
    return [];
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.js'))
    .sort();

  return files;
}

/**
 * Run migrations (up)
 */
async function runMigrationsUp() {
  log.section('Running Migrations (UP)');

  try {
    // Ensure migrations table exists
    await createMigrationsTable();

    // Get executed migrations
    const executedMigrations = await getExecutedMigrations();
    log.info(`Previously executed: ${executedMigrations.length} migrations`);

    // Get all migration files
    const migrationFiles = getMigrationFiles();
    log.info(`Found ${migrationFiles.length} migration files`);

    // Filter pending migrations
    const pendingMigrations = migrationFiles.filter(
      file => !executedMigrations.includes(file)
    );

    if (pendingMigrations.length === 0) {
      log.success('No pending migrations to execute');
      return true;
    }

    log.info(`Pending migrations: ${pendingMigrations.length}`);
    console.log('');

    // Execute pending migrations
    for (const file of pendingMigrations) {
      log.migration(`Executing: ${file}`);
      
      try {
        const migrationPath = path.join(__dirname, '../migrations', file);
        const migration = require(migrationPath);

        // Start transaction
        const transaction = await sequelize.transaction();

        try {
          // Execute UP migration
          await migration.up(sequelize.getQueryInterface(), sequelize.Sequelize);
          
          // Record migration
          await recordMigration(file);
          
          // Commit transaction
          await transaction.commit();
          
          log.success(`Completed: ${file}`);
        } catch (error) {
          // Rollback transaction on error
          await transaction.rollback();
          throw error;
        }
      } catch (error) {
        log.error(`Failed to execute ${file}: ${error.message}`);
        console.error(error.stack);
        throw new Error(`Migration failed at: ${file}`);
      }
    }

    log.section('Migration Summary');
    log.success(`Successfully executed ${pendingMigrations.length} migrations`);
    return true;

  } catch (error) {
    log.error(`Migration process failed: ${error.message}`);
    return false;
  }
}

/**
 * Rollback migrations (down)
 */
async function runMigrationsDown(count = 1) {
  log.section(`Rolling Back Last ${count} Migration(s) (DOWN)`);

  try {
    // Get executed migrations
    const executedMigrations = await getExecutedMigrations();
    
    if (executedMigrations.length === 0) {
      log.warn('No migrations to rollback');
      return true;
    }

    // Get migrations to rollback (reverse order)
    const migrationsToRollback = executedMigrations
      .slice(-count)
      .reverse();

    log.info(`Rolling back ${migrationsToRollback.length} migration(s)`);
    console.log('');

    // Execute rollback
    for (const file of migrationsToRollback) {
      log.migration(`Rolling back: ${file}`);
      
      try {
        const migrationPath = path.join(__dirname, '../migrations', file);
        const migration = require(migrationPath);

        // Start transaction
        const transaction = await sequelize.transaction();

        try {
          // Execute DOWN migration
          await migration.down(sequelize.getQueryInterface(), sequelize.Sequelize);
          
          // Remove migration record
          await removeMigration(file);
          
          // Commit transaction
          await transaction.commit();
          
          log.success(`Rolled back: ${file}`);
        } catch (error) {
          // Rollback transaction on error
          await transaction.rollback();
          throw error;
        }
      } catch (error) {
        log.error(`Failed to rollback ${file}: ${error.message}`);
        console.error(error.stack);
        throw new Error(`Rollback failed at: ${file}`);
      }
    }

    log.section('Rollback Summary');
    log.success(`Successfully rolled back ${migrationsToRollback.length} migrations`);
    return true;

  } catch (error) {
    log.error(`Rollback process failed: ${error.message}`);
    return false;
  }
}

/**
 * Show migration status
 */
async function showStatus() {
  log.section('Migration Status');

  try {
    await createMigrationsTable();
    
    const executedMigrations = await getExecutedMigrations();
    const allMigrations = getMigrationFiles();

    console.log(`\n${colors.cyan}Total migrations:${colors.reset} ${allMigrations.length}`);
    console.log(`${colors.green}Executed:${colors.reset} ${executedMigrations.length}`);
    console.log(`${colors.yellow}Pending:${colors.reset} ${allMigrations.length - executedMigrations.length}\n`);

    if (allMigrations.length > 0) {
      console.log(`${colors.cyan}Migration Files:${colors.reset}`);
      allMigrations.forEach(file => {
        const isExecuted = executedMigrations.includes(file);
        const status = isExecuted 
          ? `${colors.green}[DONE]${colors.reset}` 
          : `${colors.yellow}[PENDING]${colors.reset}`;
        console.log(`  ${status} ${file}`);
      });
    }

    return true;
  } catch (error) {
    log.error(`Failed to get status: ${error.message}`);
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  const command = process.argv[2] || 'up';
  const count = parseInt(process.argv[3]) || 1;

  log.section('Database Migration Tool');
  log.info(`Command: ${command}`);

  try {
    await sequelize.authenticate();
    log.success('Database connection established');

    let success = false;

    switch (command) {
      case 'up':
        success = await runMigrationsUp();
        break;
      
      case 'down':
        success = await runMigrationsDown(count);
        break;
      
      case 'status':
        success = await showStatus();
        break;
      
      default:
        log.error(`Unknown command: ${command}`);
        console.log('\nUsage:');
        console.log('  node runMigrations.js up          - Run pending migrations');
        console.log('  node runMigrations.js down [N]    - Rollback last N migrations (default: 1)');
        console.log('  node runMigrations.js status      - Show migration status');
        process.exit(1);
    }

    if (success) {
      log.section('✅ Operation Completed Successfully');
      process.exit(0);
    } else {
      log.section('❌ Operation Failed');
      process.exit(1);
    }

  } catch (error) {
    log.error(`Fatal error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
    log.info('Database connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  runMigrationsUp,
  runMigrationsDown,
  showStatus
};

