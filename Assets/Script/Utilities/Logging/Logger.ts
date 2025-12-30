/**
 * Logger.ts
 * 
 * Centralized logging utility to replace scattered print statements.
 * Provides different log levels and can be disabled for production.
 */

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    NONE = 4
}

export class Logger {
    private static enabled: boolean = true;
    private static level: LogLevel = LogLevel.INFO;
    private static context: string = "";

    /**
     * Enable or disable logging
     */
    static setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    /**
     * Set the minimum log level
     */
    static setLevel(level: LogLevel): void {
        this.level = level;
    }

    /**
     * Set a context prefix for all logs (e.g., class name)
     */
    static setContext(context: string): void {
        this.context = context;
    }

    /**
     * Debug level logging (most verbose)
     */
    static debug(message: string, ...args: any[]): void {
        if (this.enabled && this.level <= LogLevel.DEBUG) {
            const prefix = this.context ? `[${this.context}]` : "";
            const fullMessage = args.length > 0 
                ? `${prefix}[DEBUG] ${message} ${args.map(a => String(a)).join(" ")}`
                : `${prefix}[DEBUG] ${message}`;
            print(fullMessage);
        }
    }

    /**
     * Info level logging (general information)
     */
    static info(message: string, ...args: any[]): void {
        if (this.enabled && this.level <= LogLevel.INFO) {
            const prefix = this.context ? `[${this.context}]` : "";
            const fullMessage = args.length > 0 
                ? `${prefix}[INFO] ${message} ${args.map(a => String(a)).join(" ")}`
                : `${prefix}[INFO] ${message}`;
            print(fullMessage);
        }
    }

    /**
     * Warning level logging
     */
    static warn(message: string, ...args: any[]): void {
        if (this.enabled && this.level <= LogLevel.WARN) {
            const prefix = this.context ? `[${this.context}]` : "";
            const fullMessage = args.length > 0 
                ? `${prefix}[WARN] ${message} ${args.map(a => String(a)).join(" ")}`
                : `${prefix}[WARN] ${message}`;
            print(fullMessage);
        }
    }

    /**
     * Error level logging
     */
    static error(message: string, ...args: any[]): void {
        if (this.enabled && this.level <= LogLevel.ERROR) {
            const prefix = this.context ? `[${this.context}]` : "";
            const fullMessage = args.length > 0 
                ? `${prefix}[ERROR] ${message} ${args.map(a => String(a)).join(" ")}`
                : `${prefix}[ERROR] ${message}`;
            print(fullMessage);
        }
    }

    /**
     * Create a logger instance with a specific context
     */
    static create(context: string): LoggerInstance {
        return new LoggerInstance(context);
    }
}

/**
 * Logger instance with a fixed context
 */
export class LoggerInstance {
    constructor(private context: string) {}

    debug(message: string, ...args: any[]): void {
        Logger.setContext(this.context);
        Logger.debug(message, ...args);
    }

    info(message: string, ...args: any[]): void {
        Logger.setContext(this.context);
        Logger.info(message, ...args);
    }

    warn(message: string, ...args: any[]): void {
        Logger.setContext(this.context);
        Logger.warn(message, ...args);
    }

    error(message: string, ...args: any[]): void {
        Logger.setContext(this.context);
        Logger.error(message, ...args);
    }
}

