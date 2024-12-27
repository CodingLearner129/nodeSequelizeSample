import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
dotenvExpand.expand(dotenv.config('./../../.env'));

const CONFIG = {
    node_env: process.env.NODE_ENV || 'development',
    host: process.env.HOST || 'localhost',
    port: process.env.PORT || 3000,
    app_name: process.env.APP_NAME || "Node Sequelize Sample",

    // bcrypt
    bcrypt_salt_round: process.env.BCRYPT_SALT_ROUND || 10,

    // set locale for language
    locale: process.env.LOCALE || 'en',

    // Jwt
    jwt_encryption: process.env.JWT_ENCRYPTION || 'secret',
    jwt_expiration: process.env.JWT_EXPIRATION || '1d',
    jwt_refresh_expiration: Number(process.env.JWT_REFRESH_ENCRYPTION) || 7,

    base_url: process.env.BASE_URL || '',

    // HTTP status codes
    http_status_ok: 200,
    http_status_auth_fail: 403,
    status_success: 1,
    status_fail: 0,
};

CONFIG.whats_app_send_otp_url = `https://graph.facebook.com/v20.0/${CONFIG.whats_app_phone_number_id}/messages`;

export default {
    development: {
        username: process.env.DB_USERNAME || "postgres",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_DATABASE || "db_development",
        host: process.env.DB_HOST || "127.0.0.1",
        port: process.env.DB_PORT || 5432,
        dialect: process.env.DB_CONNECTION || "postgres",
        ...(process.env.DB_CONNECTION == "mysql" ? { charset: process.env.DB_CHARSET || 'utf8mb4' } : {}),
        ...(process.env.DB_CONNECTION == "mysql" ? { collation: process.env.DB_COLLATION || 'utf8mb4_unicode_ci' } : {}),
        logging: process.env.DB_LOGGING == 'true' || false,
        pool: {
            handleDisconnects: true,
            max: 100,
            min: 1,
            idle: 10000,
            acquire: 20000,
        },
        timezone: process.env.TIMEZONE || "+05:30",
        quoteEnumNames: true
    },
    test: {
        username: process.env.DB_USERNAME || "postgres",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_DATABASE || "db_test",
        host: process.env.DB_HOST || "127.0.0.1",
        port: process.env.DB_PORT || 5432,
        dialect: process.env.DB_CONNECTION || "postgres",
        ...(process.env.DB_CONNECTION == "mysql" ? { charset: process.env.DB_CHARSET || 'utf8mb4' } : {}),
        ...(process.env.DB_CONNECTION == "mysql" ? { collation: process.env.DB_COLLATION || 'utf8mb4_unicode_ci' } : {}),
        logging: process.env.DB_LOGGING == 'true' || false,
        pool: {
            handleDisconnects: true,
            max: 100,
            min: 1,
            idle: 10000,
            acquire: 20000,
        },
        timezone: process.env.TIMEZONE || "+05:30",
        quoteEnumNames: true
    },
    production: {
        username: process.env.DB_USERNAME || "postgres",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_DATABASE || "db_production",
        host: process.env.DB_HOST || "127.0.0.1",
        port: process.env.DB_PORT || 5432,
        dialect: process.env.DB_CONNECTION || "postgres",
        ...(process.env.DB_CONNECTION == "mysql" ? { charset: process.env.DB_CHARSET || 'utf8mb4' } : {}),
        ...(process.env.DB_CONNECTION == "mysql" ? { collation: process.env.DB_COLLATION || 'utf8mb4_unicode_ci' } : {}),
        logging: process.env.DB_LOGGING == 'true' || false,
        ssl: true,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false,
            },
        },
        pool: {
            handleDisconnects: true,
            max: 100,
            min: 1,
            idle: 10000,
            acquire: 20000,
        },
        timezone: process.env.TIMEZONE || "+05:30",
        quoteEnumNames: true
    },
    ...CONFIG,
}
