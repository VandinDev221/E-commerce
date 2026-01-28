export declare const config: {
    nodeEnv: string;
    port: number;
    frontendUrl: string;
    jwt: {
        secret: string;
        refreshSecret: string;
        expiresIn: string;
        refreshExpiresIn: string;
    };
    redis: {
        url: string;
    };
    stripe: {
        secretKey: string | undefined;
        webhookSecret: string | undefined;
    };
    cloudinary: {
        cloudName: string | undefined;
        apiKey: string | undefined;
        apiSecret: string | undefined;
    };
    resend: {
        apiKey: string | undefined;
        from: string;
    };
    google: {
        clientId: string | undefined;
        clientSecret: string | undefined;
    };
    github: {
        clientId: string | undefined;
        clientSecret: string | undefined;
    };
};
//# sourceMappingURL=index.d.ts.map