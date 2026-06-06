let prisma = null;
try {
    const { PrismaClient } = require('@prisma/client');
    prisma = new PrismaClient();
} catch (e) {
    // Prisma client not installed or not generated — keep backend functional with sqlite fallback
    console.warn('Prisma client not available. To enable, install dependencies and set DATABASE_URL.');
}

module.exports = prisma;
