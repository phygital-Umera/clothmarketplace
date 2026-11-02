import 'module-alias/register';
import {Server} from 'http';
import app from './app';
import prisma from './client';
import {config, logger} from '@config/index';
import {permissionService} from '@services/index';

let server: Server;
prisma.$connect().then(async () => {
    const dbName = await prisma.$queryRaw<{current_database: string}[]>`SELECT current_database()`;

    if (dbName && dbName[0]) {
        logger.info(`Connected to SQL Database: ${dbName[0].current_database}`);
    }
    // SUPERADMIN always holds every permission in config/permissions.ts
    const added = await permissionService.syncSuperAdmin();
    if (added) logger.info(`Granted ${added} new permission(s) to SUPERADMIN`);
    server = app.listen(config.port, () => {
        logger.info(`Listening to port ${config.port}`);
    });
});

const exitHandler = () => {
    if (server) {
        server.close(() => {
            logger.info('Server closed');
            process.exit(1);
        });
    } else {
        process.exit(1);
    }
};

const unexpectedErrorHandler = (error: unknown) => {
    logger.error(error);
    exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
    logger.info('SIGTERM received');
    if (server) {
        server.close();
    }
});
