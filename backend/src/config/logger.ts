import winston from 'winston';
import moment from 'moment';
import config from './config';

const enumerateErrorFormat = winston.format((info) => {
    if (info instanceof Error) {
        Object.assign(info, {message: info.stack});
    }
    return info;
});

const logger = winston.createLogger({
    level: config.env === 'development' ? 'debug' : 'info',
    format: winston.format.combine(
        winston.format((info) => {
            info.timestamp = moment().format('DD-MM HH:mm');
            return info;
        })(),
        enumerateErrorFormat(),
        config.env === 'development' ? winston.format.colorize() : winston.format.uncolorize(),
        winston.format.splat(),
        winston.format.printf(({timestamp, level, message}) => `${timestamp} ${level}: ${message}`),
    ),
    transports: [
        new winston.transports.Console({
            stderrLevels: ['error'],
        }),
    ],
});

export default logger;
