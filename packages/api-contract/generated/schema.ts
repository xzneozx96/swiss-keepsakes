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
    "/api/store/{storeId}/pins": {
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
                    "application/json": components["schemas"]["PinWriteBody"];
                };
            };
            responses: {
                /** @description The new draft pin */
                201: {
                    headers: {
                        /** @description The row version, as `"<rowVersion>"` */
                        ETag?: string;
                        "X-Request-Id": components["headers"]["RequestId"];
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Pin"];
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
    "/api/store/{storeId}/pins/{pinId}": {
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
                    pinId: string;
                    storeId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description The pin is deleted. Only a pin that was never published can be */
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
        patch: {
            parameters: {
                query?: never;
                header?: {
                    /** @description The row version you opened, as `3`, `"3"` or `W/"3"` */
                    "If-Match"?: string;
                };
                path: {
                    pinId: string;
                    storeId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["PinWriteBody"];
                };
            };
            responses: {
                /** @description The pin with the change saved. A left-out field stays, null clears, a list replaces */
                200: {
                    headers: {
                        /** @description The row version, as `"<rowVersion>"` */
                        ETag?: string;
                        "X-Request-Id": components["headers"]["RequestId"];
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Pin"];
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
    "/api/store/{storeId}/pins/{pinId}/hide": {
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
                header?: {
                    /** @description The row version you opened, as `3`, `"3"` or `W/"3"` */
                    "If-Match"?: string;
                };
                path: {
                    pinId: string;
                    storeId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description The pin is hidden. Its published text is kept */
                200: {
                    headers: {
                        /** @description The row version, as `"<rowVersion>"` */
                        ETag?: string;
                        "X-Request-Id": components["headers"]["RequestId"];
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Pin"];
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
    "/api/store/{storeId}/pins/{pinId}/publish": {
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
                header?: {
                    /** @description The row version you opened, as `3`, `"3"` or `W/"3"` */
                    "If-Match"?: string;
                };
                path: {
                    pinId: string;
                    storeId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description The pin is live with its draft */
                200: {
                    headers: {
                        /** @description The row version, as `"<rowVersion>"` */
                        ETag?: string;
                        "X-Request-Id": components["headers"]["RequestId"];
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Pin"];
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
    "/api/store/{storeId}/story-groups": {
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
                    "application/json": components["schemas"]["StoryGroupCreateBody"];
                };
            };
            responses: {
                /** @description The new story group, with no version yet */
                201: {
                    headers: {
                        /** @description The row version, as `"<rowVersion>"` */
                        ETag?: string;
                        "X-Request-Id": components["headers"]["RequestId"];
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["StoryGroup"];
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
    "/api/store/{storeId}/story-groups/{groupId}": {
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
                header?: {
                    /** @description The row version you opened, as `3`, `"3"` or `W/"3"` */
                    "If-Match"?: string;
                };
                path: {
                    groupId: string;
                    storeId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["StoryGroupSaveBody"];
                };
            };
            responses: {
                /** @description The group with the change saved. A left-out field stays, a list replaces */
                200: {
                    headers: {
                        /** @description The row version, as `"<rowVersion>"` */
                        ETag?: string;
                        "X-Request-Id": components["headers"]["RequestId"];
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["StoryGroup"];
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
    "/api/store/{storeId}/story-groups/{groupId}/versions": {
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
                    groupId: string;
                    storeId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["StoryVersionCreateBody"];
                };
            };
            responses: {
                /** @description The new draft version in that language */
                201: {
                    headers: {
                        /** @description The row version, as `"<rowVersion>"` */
                        ETag?: string;
                        "X-Request-Id": components["headers"]["RequestId"];
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["StoryVersion"];
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
    "/api/store/{storeId}/story-groups/{groupId}/versions/{language}": {
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
                    groupId: string;
                    language: "en" | "de";
                    storeId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description The version is deleted. Only a version that never held published text can be */
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
        patch: {
            parameters: {
                query?: never;
                header?: {
                    /** @description The row version you opened, as `3`, `"3"` or `W/"3"` */
                    "If-Match"?: string;
                };
                path: {
                    groupId: string;
                    language: "en" | "de";
                    storeId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["StoryVersionSaveBody"];
                };
            };
            responses: {
                /** @description The version with the draft saved. A save replaces the whole draft document */
                200: {
                    headers: {
                        /** @description The row version, as `"<rowVersion>"` */
                        ETag?: string;
                        "X-Request-Id": components["headers"]["RequestId"];
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["StoryVersion"];
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
    "/api/store/{storeId}/story-groups/{groupId}/versions/{language}/move": {
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
                header?: {
                    /** @description The row version you opened, as `3`, `"3"` or `W/"3"` */
                    "If-Match"?: string;
                };
                path: {
                    groupId: string;
                    language: "en" | "de";
                    storeId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["StoryVersionMoveBody"];
                };
            };
            responses: {
                /** @description The draft version now belongs to the target group. A published version cannot move */
                200: {
                    headers: {
                        /** @description The row version, as `"<rowVersion>"` */
                        ETag?: string;
                        "X-Request-Id": components["headers"]["RequestId"];
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["StoryVersion"];
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
    "/api/store/{storeId}/story-groups/{groupId}/versions/{language}/publish": {
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
                header?: {
                    /** @description The row version you opened, as `3`, `"3"` or `W/"3"` */
                    "If-Match"?: string;
                };
                path: {
                    groupId: string;
                    language: "en" | "de";
                    storeId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description This language is live with its draft. Other languages are not touched */
                200: {
                    headers: {
                        /** @description The row version, as `"<rowVersion>"` */
                        ETag?: string;
                        "X-Request-Id": components["headers"]["RequestId"];
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["StoryVersion"];
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
    "/api/store/{storeId}/story-groups/{groupId}/versions/{language}/unpublish": {
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
                header?: {
                    /** @description The row version you opened, as `3`, `"3"` or `W/"3"` */
                    "If-Match"?: string;
                };
                path: {
                    groupId: string;
                    language: "en" | "de";
                    storeId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description The version is a draft again. Its published text is kept */
                200: {
                    headers: {
                        /** @description The row version, as `"<rowVersion>"` */
                        ETag?: string;
                        "X-Request-Id": components["headers"]["RequestId"];
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["StoryVersion"];
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
    "/api/store/{storeId}/tours": {
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
                    "application/json": components["schemas"]["TourGuideWriteBody"];
                };
            };
            responses: {
                /** @description The new draft tour guide */
                201: {
                    headers: {
                        /** @description The row version, as `"<rowVersion>"` */
                        ETag?: string;
                        "X-Request-Id": components["headers"]["RequestId"];
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["TourGuide"];
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
    "/api/store/{storeId}/tours/{tourId}": {
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
                    storeId: string;
                    tourId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description The tour guide is deleted with its stops. Only one that was never published can be */
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
        patch: {
            parameters: {
                query?: never;
                header?: {
                    /** @description The row version you opened, as `3`, `"3"` or `W/"3"` */
                    "If-Match"?: string;
                };
                path: {
                    storeId: string;
                    tourId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["TourGuideWriteBody"];
                };
            };
            responses: {
                /** @description The tour guide with the change saved. A left-out field stays, null clears, a list replaces */
                200: {
                    headers: {
                        /** @description The row version, as `"<rowVersion>"` */
                        ETag?: string;
                        "X-Request-Id": components["headers"]["RequestId"];
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["TourGuide"];
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
    "/api/store/{storeId}/tours/{tourId}/publish": {
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
                header?: {
                    /** @description The row version you opened, as `3`, `"3"` or `W/"3"` */
                    "If-Match"?: string;
                };
                path: {
                    storeId: string;
                    tourId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description The tour guide is live with its draft */
                200: {
                    headers: {
                        /** @description The row version, as `"<rowVersion>"` */
                        ETag?: string;
                        "X-Request-Id": components["headers"]["RequestId"];
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["TourGuide"];
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
    "/api/store/{storeId}/tours/{tourId}/unpublish": {
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
                header?: {
                    /** @description The row version you opened, as `3`, `"3"` or `W/"3"` */
                    "If-Match"?: string;
                };
                path: {
                    storeId: string;
                    tourId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description The tour guide is a draft again. Its published text is kept */
                200: {
                    headers: {
                        /** @description The row version, as `"<rowVersion>"` */
                        ETag?: string;
                        "X-Request-Id": components["headers"]["RequestId"];
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["TourGuide"];
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
        /** @description Text per language. A present key is non-empty and at most 20000 characters */
        LocalizedLongText: {
            de?: string;
            en?: string;
        };
        /** @description Text per language. A present key is non-empty and at most 300 characters */
        LocalizedText: {
            de?: string;
            en?: string;
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
        /** @description A map pin as the editor sees it, with its draft and its published text */
        Pin: {
            address: string | null;
            categoryIds: string[];
            /** Format: uuid */
            coverMediaId: string | null;
            /** Format: date-time */
            createdAt: string;
            dates: {
                endTime: string | null;
                firstDay: string;
                /** Format: uuid */
                id: string;
                lastDay: string;
                startTime: string | null;
            }[];
            draft: {
                tip: {
                    de?: string;
                    en?: string;
                };
                title: {
                    de?: string;
                    en?: string;
                };
            } | null;
            /** Format: date-time */
            firstPublishedAt: string | null;
            /** Format: uuid */
            id: string;
            interests: string[];
            latitude: number | null;
            longitude: number | null;
            /** Format: uuid */
            mainStoryGroupId: string | null;
            published: {
                tip: {
                    de?: string;
                    en?: string;
                };
                title: {
                    de?: string;
                    en?: string;
                };
            } | null;
            rowVersion: number;
            slug: {
                de?: string;
                en?: string;
            } | null;
            /** @enum {string} */
            status: "draft" | "published" | "hidden";
            /** @enum {string} */
            stayTag: "short_stay" | "multi_day" | "both";
            /** Format: uuid */
            storeId: string;
            /** Format: date-time */
            updatedAt: string;
            weeklyHours: {
                closes: string;
                day: number;
                opens: string;
            }[];
        };
        /** @description Every field is optional. A pin has no type and no price */
        PinWriteBody: {
            address?: string | null;
            categoryIds?: string[];
            /** Format: uuid */
            coverMediaId?: string | null;
            dates?: {
                endTime?: string | null;
                /** Format: date */
                firstDay: string;
                /** Format: date */
                lastDay: string;
                startTime?: string | null;
            }[];
            interests?: ("history-culture" | "food-drink" | "lake-mountains" | "shopping-keepsakes")[];
            latitude?: number | null;
            longitude?: number | null;
            /** Format: uuid */
            mainStoryGroupId?: string | null;
            slug?: {
                de?: string;
                en?: string;
            } | null;
            /** @enum {string} */
            stayTag?: "short_stay" | "multi_day" | "both";
            tip?: components["schemas"]["LocalizedLongText"];
            title?: components["schemas"]["LocalizedText"];
            weeklyHours?: {
                closes: string;
                /** @description 1 is Monday, 7 is Sunday */
                day: number;
                opens: string;
            }[];
        };
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
            /** @description A stable code. Known codes: about:blank, not-found, validation-failed, internal-error, unhealthy, idempotency-key-required, idempotency-key-reused, idempotency-key-in-use, body-too-large, unauthenticated, forbidden, origin-refused, store-slug-taken, owner-is-super-admin, invitation-not-found, invitation-expired, invitation-revoked, invitation-super-admin, invitation-already-accepted, invitation-email-mismatch, invitation-email-unverified, already-a-member, store-not-onboarding, onboarding-incomplete, manager-is-super-admin, invitation-already-open, cannot-remove-owner, member-not-found, precondition-failed, precondition-required, publish-incomplete, media-retired, media-invalid, reference-invalid, content-slug-taken, published-cannot-be-deleted, published-version-cannot-move, version-exists, not-published, content-in-use. Show generic copy for any other */
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
        /** @description The text of one story version. The title may be empty until it is published */
        StoryDraft: {
            authorName: string;
            authorRole: string;
            /** Format: uuid */
            coverMediaId: string | null;
            excerpt: string;
            intro: string;
            readMinutes: number | null;
            sections: {
                blocks: ({
                    text: string;
                    /** @enum {string} */
                    type: "paragraph";
                } | {
                    caption: string;
                    /** Format: uuid */
                    mediaId: string;
                    /** @enum {string} */
                    type: "image";
                } | {
                    caption: string;
                    title: string;
                    /** @enum {string} */
                    type: "video";
                    youtubeId: string;
                } | {
                    caption: string;
                    /** Format: uuid */
                    mediaId: string;
                    title: string;
                    /** @enum {string} */
                    type: "audio";
                })[];
                heading: string;
                id: string;
            }[];
            title: string;
        };
        /** @description The shared part of the language versions of one story */
        StoryGroup: {
            categoryIds: string[];
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            id: string;
            interests: string[];
            keepsakeProductIds: string[];
            /** @enum {string} */
            kind: "story" | "editorial_review";
            placeIds: string[];
            relatedGroupIds: string[];
            rowVersion: number;
            /** @enum {string} */
            stayTag: "short_stay" | "multi_day" | "both";
            /** Format: uuid */
            storeId: string;
            /** Format: uuid */
            subjectPlaceId: string | null;
            /** Format: date-time */
            updatedAt: string;
        };
        StoryGroupCreateBody: {
            categoryIds?: string[];
            interests?: ("history-culture" | "food-drink" | "lake-mountains" | "shopping-keepsakes")[];
            keepsakeProductIds?: string[];
            /**
             * @default story
             * @enum {string}
             */
            kind: "story" | "editorial_review";
            placeIds?: string[];
            relatedGroupIds?: string[];
            /** @enum {string} */
            stayTag?: "short_stay" | "multi_day" | "both";
            /** Format: uuid */
            subjectPlaceId?: string;
        };
        StoryGroupSaveBody: {
            categoryIds?: string[];
            interests?: ("history-culture" | "food-drink" | "lake-mountains" | "shopping-keepsakes")[];
            keepsakeProductIds?: string[];
            placeIds?: string[];
            relatedGroupIds?: string[];
            /** @enum {string} */
            stayTag?: "short_stay" | "multi_day" | "both";
        };
        /** @description One language version of a story, with its draft and its published text */
        StoryVersion: {
            /** Format: date-time */
            createdAt: string;
            draft: {
                authorName: string;
                authorRole: string;
                /** Format: uuid */
                coverMediaId: string | null;
                excerpt: string;
                intro: string;
                readMinutes: number | null;
                sections: {
                    blocks: ({
                        text: string;
                        /** @enum {string} */
                        type: "paragraph";
                    } | {
                        caption: string;
                        /** Format: uuid */
                        mediaId: string;
                        /** @enum {string} */
                        type: "image";
                    } | {
                        caption: string;
                        title: string;
                        /** @enum {string} */
                        type: "video";
                        youtubeId: string;
                    } | {
                        caption: string;
                        /** Format: uuid */
                        mediaId: string;
                        title: string;
                        /** @enum {string} */
                        type: "audio";
                    })[];
                    heading: string;
                    id: string;
                }[];
                title: string;
            } | null;
            /** Format: uuid */
            groupId: string;
            /** @enum {string} */
            language: "en" | "de";
            published: {
                authorName: string;
                authorRole: string;
                /** Format: uuid */
                coverMediaId: string | null;
                excerpt: string;
                intro: string;
                readMinutes: number | null;
                sections: {
                    blocks: ({
                        text: string;
                        /** @enum {string} */
                        type: "paragraph";
                    } | {
                        caption: string;
                        /** Format: uuid */
                        mediaId: string;
                        /** @enum {string} */
                        type: "image";
                    } | {
                        caption: string;
                        title: string;
                        /** @enum {string} */
                        type: "video";
                        youtubeId: string;
                    } | {
                        caption: string;
                        /** Format: uuid */
                        mediaId: string;
                        title: string;
                        /** @enum {string} */
                        type: "audio";
                    })[];
                    heading: string;
                    id: string;
                }[];
                title: string;
            } | null;
            /** Format: date-time */
            publishedAt: string | null;
            rowVersion: number;
            slug: string | null;
            /** @enum {string} */
            status: "draft" | "published";
            /** Format: uuid */
            storeId: string;
            /** Format: date-time */
            updatedAt: string;
        };
        StoryVersionCreateBody: {
            draft?: components["schemas"]["StoryDraft"];
            /** @enum {string} */
            language: "en" | "de";
            slug?: string;
        };
        StoryVersionMoveBody: {
            /** Format: uuid */
            targetGroupId: string;
        };
        StoryVersionSaveBody: {
            draft?: components["schemas"]["StoryDraft"];
            slug?: string | null;
        };
        /** @description A tour guide as the editor sees it, with its draft and its published text */
        TourGuide: {
            /** Format: uuid */
            coverMediaId: string | null;
            /** Format: date-time */
            createdAt: string;
            draft: {
                meetingPoint: {
                    de?: string;
                    en?: string;
                };
                sections: {
                    body: {
                        de?: string;
                        en?: string;
                    };
                    heading: {
                        de?: string;
                        en?: string;
                    };
                    id: string;
                }[];
                summary: {
                    de?: string;
                    en?: string;
                };
                title: {
                    de?: string;
                    en?: string;
                };
            } | null;
            durationMinutes: number | null;
            /** Format: uuid */
            id: string;
            interests: string[];
            keepsakeProductIds: string[];
            /** Format: uuid */
            pdfMediaId: string | null;
            published: {
                meetingPoint: {
                    de?: string;
                    en?: string;
                };
                sections: {
                    body: {
                        de?: string;
                        en?: string;
                    };
                    heading: {
                        de?: string;
                        en?: string;
                    };
                    id: string;
                }[];
                summary: {
                    de?: string;
                    en?: string;
                };
                title: {
                    de?: string;
                    en?: string;
                };
            } | null;
            rowVersion: number;
            slug: {
                de?: string;
                en?: string;
            } | null;
            /** @enum {string} */
            status: "draft" | "published";
            /** @enum {string} */
            stayTag: "short_stay" | "multi_day" | "both";
            stops: {
                /** Format: uuid */
                id: string;
                latitude: number;
                longitude: number;
                /** Format: uuid */
                mediaId: string | null;
                minutesFromStart: number | null;
                /** Format: uuid */
                placeId: string | null;
                position: number;
                text: {
                    de?: string;
                    en?: string;
                };
                title: {
                    de?: string;
                    en?: string;
                };
            }[];
            /** Format: uuid */
            storeId: string;
            /** Format: date-time */
            updatedAt: string;
        };
        /** @description Every field is optional. A tour guide has no price and no departure */
        TourGuideWriteBody: {
            /** Format: uuid */
            coverMediaId?: string | null;
            draft?: {
                meetingPoint?: components["schemas"]["LocalizedText"];
                sections?: {
                    body: components["schemas"]["LocalizedLongText"];
                    heading: components["schemas"]["LocalizedText"];
                    id: string;
                }[];
                summary?: components["schemas"]["LocalizedLongText"];
                title?: components["schemas"]["LocalizedText"];
            };
            durationMinutes?: number | null;
            interests?: ("history-culture" | "food-drink" | "lake-mountains" | "shopping-keepsakes")[];
            keepsakeProductIds?: string[];
            /** Format: uuid */
            pdfMediaId?: string | null;
            slug?: {
                de?: string;
                en?: string;
            } | null;
            /** @enum {string} */
            stayTag?: "short_stay" | "multi_day" | "both";
            stops?: {
                latitude: number;
                longitude: number;
                /** Format: uuid */
                mediaId?: string | null;
                minutesFromStart?: number | null;
                /** Format: uuid */
                placeId?: string | null;
                text?: components["schemas"]["LocalizedLongText"];
                title?: components["schemas"]["LocalizedText"];
            }[];
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
