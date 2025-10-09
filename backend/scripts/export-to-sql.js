// Deprecated: SQL export removed.
// This project now uses MongoDB (and a file fallback) for persistence.
// The original SQL export/migration utilities were removed because they relied on
// native binaries and added complexity for Windows development.
//
// If you still need an SQL export for migrations, re-create it from `src/db.json`.
console.log('scripts/export-to-sql.js is deprecated and has been disabled.');
if (require.main === module) process.exit(0);
