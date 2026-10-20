// Generated from the API routes by `pnpm contract:build`. Do not edit: the [E1.10] contract test fails on any difference.
/* eslint-disable */

export interface paths {
    "/api/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description The signed-in guest */
                200: {
                    headers: {
                        "X-Request-Id": components["headers"]["RequestId"];
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Me"];
                    };
                };
                /** @description No session, or the session expired or was revoked */
                401: {
                    headers: {
                        "X-Request-Id": components["headers"]["RequestId"];
                        [name: string]: unknown;
                    };
                    content: {
                        "application/problem+json": components["schemas"]["Problem"];
                    };
                };
                /** @description An RFC 9457 problem. `type` says what went wrong */
                default: {
                    headers: {
                        "X-Request-Id": components["headers"]["RequestId"];
                        [name: string]: unknown;
                    };
                    content: {
                        "application/problem+json": components["schemas"]["Problem"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/healthz": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description The database and this process's pg-boss answer */
                200: {
                    headers: {
                        "X-Request-Id": components["headers"]["RequestId"];
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Health"];
                    };
                };
                /** @description A check failed. The problem+json body lists each check */
                503: {
                    headers: {
                        "X-Request-Id": components["headers"]["RequestId"];
                        [name: string]: unknown;
                    };
                    content: {
                        "application/problem+json": components["schemas"]["Problem"];
                    };
                };
                /** @description An RFC 9457 problem. `type` says what went wrong */
                default: {
                    headers: {
                        "X-Request-Id": components["headers"]["RequestId"];
                        [name: string]: unknown;
                    };
                    content: {
                        "application/problem+json": components["schemas"]["Problem"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        Health: {
            /** @enum {string} */
            status: "ok";
        };
        Me: {
            /**
             * Format: uuid
             * @description The guest profile that the guest's orders and bookings point at
             */
            guestId: string;
        };
        /** @description RFC 9457 problem details, sent as application/problem+json */
        Problem: {
            checks?: {
                [key: string]: "ok" | "failed";
            };
            errors?: {
                in: string;
                message: string;
                path: string;
            }[];
            /** @description The request path */
            instance: string;
            /** @description The server's id for this request, also sent as X-Request-Id */
            requestId: string;
            status: number;
            title: string;
            /** @description A stable code. Known codes: about:blank, not-found, validation-failed, internal-error, unhealthy, idempotency-key-required, idempotency-key-reused, idempotency-key-in-use, body-too-large, unauthenticated. Show generic copy for any other */
            type: string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: {
        /** @description The server's id for this request. A problem body carries it as requestId */
        RequestId: string;
    };
    pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;
