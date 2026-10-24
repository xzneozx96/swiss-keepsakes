// Generated from the API routes by `pnpm contract:build`. Do not edit: the [E1.10] contract test fails on any difference.
/* eslint-disable */

export interface paths {
    "/api/admin/stores": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    cursor?: string;
                    limit?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description A page of stores, newest first */
                200: {
                    headers: {
                        "X-Request-Id": components["headers"]["RequestId"];
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["AdminStoreList"];
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
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CreateStore"];
                };
            };
            responses: {
                /** @description The store, as `invited`, with its Owner invitation. The N20 mail is queued */
                201: {
                    headers: {
                        "X-Request-Id": components["headers"]["RequestId"];
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["AdminStore"];
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
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/admin/stores/{id}/owner-invitation/resend": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["ResendOwnerInvitation"];
                };
            };
            responses: {
                /** @description The store. Its Owner invitation lives 7 more days and only the new mail's link works */
                200: {
                    headers: {
                        "X-Request-Id": components["headers"]["RequestId"];
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["AdminStore"];
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
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
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
                /** @description The signed-in guest and the stores they belong to */
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
    "/api/me/invitations/accept": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["AcceptInvitation"];
                };
            };
            responses: {
                /** @description The signed-in user now belongs to the store */
                200: {
                    headers: {
                        "X-Request-Id": components["headers"]["RequestId"];
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["AcceptedInvitation"];
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
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/public/invitations/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["PreviewInvitation"];
                };
            };
            responses: {
                /** @description The store, the role, the inviter's name and the state of the invitation. Never the invited address */
                200: {
                    headers: {
                        "X-Request-Id": components["headers"]["RequestId"];
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["InvitationPreview"];
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
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/store/{storeId}/information": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    storeId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["StoreInformation"];
                };
            };
            responses: {
                /** @description The store with its new information */
                200: {
                    headers: {
                        "X-Request-Id": components["headers"]["RequestId"];
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Store"];
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
        trace?: never;
    };
    "/api/store/{storeId}/member-invitations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    storeId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["InviteManager"];
                };
            };
            responses: {
                /** @description The Store Manager invitation. The N18 mail is queued */
                201: {
                    headers: {
                        "X-Request-Id": components["headers"]["RequestId"];
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["MemberInvitation"];
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
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/store/{storeId}/member-invitations/{invitationId}/resend": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    invitationId: string;
                    storeId: string;
                };
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["ResendManagerInvitation"];
                };
            };
            responses: {
                /** @description The invitation lives 7 more days and only the new mail's link works */
                200: {
                    headers: {
                        "X-Request-Id": components["headers"]["RequestId"];
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["MemberInvitation"];
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
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/store/{storeId}/member-invitations/{invitationId}/revoke": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    invitationId: string;
                    storeId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description The invitation is revoked and its link stops working at once */
                200: {
                    headers: {
                        "X-Request-Id": components["headers"]["RequestId"];
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["MemberInvitation"];
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
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/store/{storeId}/members": {
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
                path: {
                    storeId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description The store's members and its pending Store Manager invitations. Owner only */
                200: {
                    headers: {
                        "X-Request-Id": components["headers"]["RequestId"];
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Members"];
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
    "/api/store/{storeId}/members/{memberId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    memberId: string;
                    storeId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description The Store Manager no longer belongs to the store. Their next request is refused */
                204: {
                    headers: {
                        "X-Request-Id": components["headers"]["RequestId"];
                        [name: string]: unknown;
                    };
                    content?: never;
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
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/store/{storeId}/onboarding": {
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
                path: {
                    storeId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description The store and the four conditions for opening it for sale */
                200: {
                    headers: {
                        "X-Request-Id": components["headers"]["RequestId"];
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Onboarding"];
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
    "/api/store/{storeId}/open-for-sale": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    storeId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description The store is live */
                200: {
                    headers: {
                        "X-Request-Id": components["headers"]["RequestId"];
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Store"];
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
        /** @description A repeated accept by the user who took the invitation answers the same, while they still belong to the store */
        AcceptedInvitation: {
            /** @enum {string} */
            role: "owner" | "manager";
            /** Format: uuid */
            storeId: string;
            /** @enum {string} */
            storeStatus: "invited" | "onboarding" | "live" | "suspended";
        };
        AcceptInvitation: {
            token: string;
        };
        /** @description A store as A01 lists it: its Owner invitation and whether its payment account is verified */
        AdminStore: {
            /** Format: date-time */
            createdAt: string;
            /** @enum {string} */
            defaultLanguage: "en" | "de";
            /** Format: uuid */
            id: string;
            invitation: components["schemas"]["OwnerInvitation"];
            name: string;
            paymentAccount: components["schemas"]["ConditionState"];
            slug: string;
            /** @enum {string} */
            status: "invited" | "onboarding" | "live" | "suspended";
        };
        AdminStoreList: {
            items: components["schemas"]["AdminStore"][];
            /**
             * Format: uuid
             * @description Pass it as `cursor` for the next page. Null on the last page
             */
            nextCursor: string | null;
        };
        /**
         * @description `pending` means the story that decides the condition is not built yet. It counts as unmet
         * @enum {string}
         */
        ConditionState: "met" | "unmet" | "pending";
        CreateStore: {
            /**
             * @default en
             * @enum {string}
             */
            defaultLanguage: "en" | "de";
            /**
             * @description The language of the invitation mail N20. The store's default language when left out
             * @enum {string}
             */
            language?: "en" | "de";
            name: string;
            /** Format: email */
            ownerEmail: string;
            slug: string;
        };
        Health: {
            /** @enum {string} */
            status: "ok";
        };
        /** @description What M01 and A02 show before sign-in. It never carries the invited address */
        InvitationPreview: {
            /** @description The inviting user's name, or null when they have none or the invitation is an Owner invitation. It is never their address */
            inviterName: string | null;
            /** @enum {string} */
            role: "owner" | "manager";
            /** @enum {string} */
            state: "open" | "expired" | "revoked" | "accepted";
            storeName: string;
        };
        InviteManager: {
            /** Format: email */
            email: string;
            /**
             * @description The language of the invitation mail N18. The store's default language when left out
             * @enum {string}
             */
            language?: "en" | "de";
        };
        Me: {
            /**
             * Format: uuid
             * @description The guest profile that the guest's orders and bookings point at
             */
            guestId: string;
            /** @description The stores the user belongs to, oldest membership first. Empty for a guest and for a Super Admin, who hold no store role */
            stores: components["schemas"]["MeStore"][];
        };
        Member: {
            /** Format: date-time */
            acceptedAt: string;
            /** @description The member's sign-in address, in lower case */
            email: string;
            /**
             * Format: uuid
             * @description The membership id, which `DELETE /members/{memberId}` takes. It is not the user id
             */
            id: string;
            /** @enum {string} */
            role: "owner" | "manager";
        };
        /** @description A Store Manager invitation. It never carries the link or the token */
        MemberInvitation: {
            /** @description The address the Store Manager was invited at, in lower case */
            email: string;
            /** Format: date-time */
            expiresAt: string;
            /** Format: uuid */
            id: string;
            /** @enum {string} */
            state: "open" | "accepted" | "revoked" | "expired";
        };
        /** @description M22's members tab: who belongs to the store and who was invited */
        Members: {
            /** @description The Store Manager invitations that are neither accepted nor revoked, newest first. An `expired` one can be sent again */
            invitations: components["schemas"]["MemberInvitation"][];
            members: components["schemas"]["Member"][];
        };
        MeStore: {
            /** @enum {string} */
            role: "owner" | "manager";
            /** @enum {string} */
            status: "invited" | "onboarding" | "live" | "suspended";
            /** Format: uuid */
            storeId: string;
        };
        Onboarding: {
            conditions: {
                /** @enum {string} */
                key: "store-information" | "payment-account" | "catalogue" | "policies";
                state: components["schemas"]["ConditionState"];
            }[];
            mayOpenForSale: boolean;
            store: components["schemas"]["Store"];
        };
        /** @description The newest Owner invitation of a store */
        OwnerInvitation: {
            /** @description The address the Owner was invited at, in lower case */
            email: string;
            /** Format: date-time */
            expiresAt: string;
            /** @enum {string} */
            state: "open" | "accepted" | "revoked" | "expired";
        } | null;
        PreviewInvitation: {
            /** @description The token from the invitation link. It travels in the body, never in the query string */
            token: string;
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
            /** @description A stable code. Known codes: about:blank, not-found, validation-failed, internal-error, unhealthy, idempotency-key-required, idempotency-key-reused, idempotency-key-in-use, body-too-large, unauthenticated, forbidden, origin-refused, store-slug-taken, owner-is-super-admin, invitation-not-found, invitation-expired, invitation-revoked, invitation-super-admin, invitation-already-accepted, invitation-email-mismatch, invitation-email-unverified, already-a-member, store-not-onboarding, onboarding-incomplete, manager-is-super-admin, invitation-already-open, cannot-remove-owner, member-not-found. Show generic copy for any other */
            type: string;
        };
        ResendManagerInvitation: {
            /**
             * @description The language of the invitation mail N18. The store's default language when left out
             * @enum {string}
             */
            language?: "en" | "de";
        };
        ResendOwnerInvitation: {
            /**
             * @description The language of the invitation mail N20. The store's default language when left out
             * @enum {string}
             */
            language?: "en" | "de";
        };
        Store: {
            /** Format: date-time */
            createdAt: string;
            /** @enum {string} */
            defaultLanguage: "en" | "de";
            /** Format: uuid */
            id: string;
            name: string;
            slug: string;
            /** @enum {string} */
            status: "invited" | "onboarding" | "live" | "suspended";
        };
        StoreInformation: {
            /** @enum {string} */
            defaultLanguage?: "en" | "de";
            name?: string;
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
