"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateApiKey = exports.extractRawApiKey = exports.hashApiKey = exports.API_KEY_HEADER = void 0;
var node_crypto_1 = require("node:crypto");
var env_1 = require("@/config/env");
var prisma_1 = require("@/lib/prisma");
var rateLimit_1 = require("@/lib/rateLimit");
exports.API_KEY_HEADER = "x-hyrelog-key";
var AUTHORIZATION_PREFIX = "ApiKey ";
/**
 * Deterministically hash an API key using the shared secret salt.
 */
var hashApiKey = function (rawKey) {
    return node_crypto_1.default.createHmac("sha256", env_1.env.API_KEY_SECRET).update(rawKey).digest("hex");
};
exports.hashApiKey = hashApiKey;
/**
 * Extracts a raw API key from headers.
 */
var extractRawApiKey = function (request) {
    var _a;
    var headerKey = (_a = request.headers[exports.API_KEY_HEADER]) !== null && _a !== void 0 ? _a : request.headers[exports.API_KEY_HEADER.toLowerCase()];
    if (typeof headerKey === "string" && headerKey.trim().length > 0) {
        return headerKey.trim();
    }
    var authHeader = request.headers.authorization;
    if (authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith(AUTHORIZATION_PREFIX)) {
        return authHeader.slice(AUTHORIZATION_PREFIX.length).trim();
    }
    return null;
};
exports.extractRawApiKey = extractRawApiKey;
/**
 * Authenticates the incoming API key and attaches context to the request.
 */
var authenticateApiKey = function (request_1) {
    var args_1 = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args_1[_i - 1] = arguments[_i];
    }
    return __awaiter(void 0, __spreadArray([request_1], args_1, true), void 0, function (request, options) {
        var rawKey, hashedKey, apiKey, context;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    rawKey = (0, exports.extractRawApiKey)(request);
                    if (!rawKey) {
                        throw request.server.httpErrors.unauthorized("API key missing");
                    }
                    hashedKey = (0, exports.hashApiKey)(rawKey);
                    return [4 /*yield*/, prisma_1.prisma.apiKey.findFirst({
                            where: {
                                hashedKey: hashedKey,
                                revokedAt: null,
                            },
                            include: {
                                company: true,
                                workspace: true,
                            },
                        })];
                case 1:
                    apiKey = _a.sent();
                    if (!apiKey) {
                        throw request.server.httpErrors.unauthorized("Invalid API key");
                    }
                    if (options.allow && !options.allow.includes(apiKey.type)) {
                        throw request.server.httpErrors.forbidden("API key is not permitted for this endpoint");
                    }
                    context = {
                        apiKey: apiKey,
                        company: apiKey.company,
                        workspace: apiKey.workspace,
                    };
                    enforceRateLimit(request, "key:".concat(apiKey.id), env_1.env.RATE_LIMIT_PER_KEY);
                    request.apiKeyContext = context;
                    return [2 /*return*/, context];
            }
        });
    });
};
exports.authenticateApiKey = authenticateApiKey;
var enforceRateLimit = function (request, identifier, limit) {
    var windowMs = env_1.env.RATE_LIMIT_WINDOW_SECONDS * 1000;
    var result = rateLimit_1.rateLimiter.consume(identifier, { limit: limit, windowMs: windowMs });
    if (result.limited) {
        throw request.server.httpErrors.tooManyRequests("API key rate limit exceeded");
    }
};
