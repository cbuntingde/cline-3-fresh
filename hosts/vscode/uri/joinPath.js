"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinPath = joinPath;
const vscode = __importStar(require("vscode"));
const uri_1 = require("../../../src/shared/proto/host/uri");
/**
 * Joins a URI with additional path segments
 * @param request The request containing the base URI and path segments
 * @returns A new URI with the path segments joined
 */
async function joinPath(request) {
    // Convert proto Uri to vscode.Uri
    if (!request.base) {
        throw new Error("Base URI is required");
    }
    const baseUri = vscode.Uri.parse(`${request.base.scheme}://${request.base.authority}${request.base.path}`);
    // Join paths
    const result = vscode.Uri.joinPath(baseUri, ...request.pathSegments);
    // Convert back to proto Uri
    return uri_1.Uri.create({
        scheme: result.scheme,
        authority: result.authority,
        path: result.path,
        query: result.query,
        fragment: result.fragment,
        fsPath: result.fsPath,
    });
}
//# sourceMappingURL=joinPath.js.map