/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as analytics from "../analytics.js";
import type * as conversations from "../conversations.js";
import type * as documents from "../documents.js";
import type * as folders from "../folders.js";
import type * as userSettings from "../userSettings.js";
import type * as workspaceActivities from "../workspaceActivities.js";
import type * as workspaceInvitations from "../workspaceInvitations.js";
import type * as workspaceProjects from "../workspaceProjects.js";
import type * as workspaces from "../workspaces.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  analytics: typeof analytics;
  conversations: typeof conversations;
  documents: typeof documents;
  folders: typeof folders;
  userSettings: typeof userSettings;
  workspaceActivities: typeof workspaceActivities;
  workspaceInvitations: typeof workspaceInvitations;
  workspaceProjects: typeof workspaceProjects;
  workspaces: typeof workspaces;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
