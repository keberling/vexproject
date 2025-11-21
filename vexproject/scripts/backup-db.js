#!/usr/bin/env node

/**
 * Database Backup Script
 * Creates a timestamped backup of the SQLite database
 */

const fs = require('fs')
const path = require('path')

const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './prisma/dev.db'
const backupDir = path.join(process.cwd(), 'backups')

// Create backups directory if it doesn't exist
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true })
}

// Generate backup filename with timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
const backupPath = path.join(backupDir, `db-backup-${timestamp}.db`)

try {
  // Check if database file exists
  if (!fs.existsSync(dbPath)) {
    console.error(`❌ Database file not found: ${dbPath}`)
    process.exit(1)
  }

  // Copy database file
  fs.copyFileSync(dbPath, backupPath)
  
  const stats = fs.statSync(backupPath)
  const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2)
  
  console.log(`✅ Database backed up successfully!`)
  console.log(`   Source: ${dbPath}`)
  console.log(`   Backup: ${backupPath}`)
  console.log(`   Size: ${sizeInMB} MB`)
  console.log(`\n💡 To restore: cp ${backupPath} ${dbPath}`)
} catch (error) {
  console.error('❌ Backup failed:', error.message)
  process.exit(1)
}

