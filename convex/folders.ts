import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Create a new folder
export const createFolder = mutation({
  args: {
    id: v.string(),
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    parentFolderId: v.optional(v.string()),
    color: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    // Check if folder with same name exists in the same parent
    const existing = await ctx.db
      .query("folders")
      .withIndex("by_user_parent", (q) =>
        q.eq("userId", args.userId)
         .eq("parentFolderId", args.parentFolderId || null)
      )
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();

    if (existing) {
      throw new Error("Folder with this name already exists in this location");
    }

    return await ctx.db.insert("folders", {
      ...args,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      documentCount: 0
    });
  },
});

// Get user's folder structure
export const getUserFolders = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const folders = await ctx.db
      .query("folders")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Build hierarchical structure
    const folderMap = new Map();
    const rootFolders: any[] = [];

    // First pass: create all folder objects
    folders.forEach(folder => {
      folderMap.set(folder.id, { ...folder, children: [] });
    });

    // Second pass: build hierarchy
    folders.forEach(folder => {
      const folderObj = folderMap.get(folder.id);
      if (folder.parentFolderId && folderMap.has(folder.parentFolderId)) {
        folderMap.get(folder.parentFolderId).children.push(folderObj);
      } else {
        rootFolders.push(folderObj);
      }
    });

    return rootFolders.sort((a, b) => a.name.localeCompare(b.name));
  },
});

// Get folder contents (documents and subfolders)
export const getFolderContents = query({
  args: { 
    userId: v.string(), 
    folderId: v.optional(v.string()) 
  },
  handler: async (ctx, args) => {
    // Get subfolders
    const subfolders = await ctx.db
      .query("folders")
      .withIndex("by_user_parent", (q) =>
        q.eq("userId", args.userId)
         .eq("parentFolderId", args.folderId || null)
      )
      .collect();

    // Get documents in this folder
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_folder", (q) => 
        q.eq("folderId", args.folderId || null)
      )
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    return {
      folders: subfolders.sort((a, b) => a.name.localeCompare(b.name)),
      documents: documents.sort((a, b) => b.createdAt - a.createdAt)
    };
  },
});

// Update folder
export const updateFolder = mutation({
  args: {
    folderId: v.string(),
    userId: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    parentFolderId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const folder = await ctx.db
      .query("folders")
      .filter((q) => 
        q.and(
          q.eq(q.field("id"), args.folderId),
          q.eq(q.field("userId"), args.userId)
        )
      )
      .first();

    if (!folder) {
      throw new Error("Folder not found");
    }

    // Check for name conflicts if renaming
    if (args.name && args.name !== folder.name) {
      const existing = await ctx.db
        .query("folders")
        .withIndex("by_user_parent", (q) =>
          q.eq("userId", args.userId)
           .eq("parentFolderId", args.parentFolderId ?? folder.parentFolderId)
        )
        .filter((q) => q.eq(q.field("name"), args.name))
        .first();

      if (existing && existing._id !== folder._id) {
        throw new Error("Folder with this name already exists");
      }
    }

    const updateData: any = { updatedAt: Date.now() };
    if (args.name !== undefined) updateData.name = args.name;
    if (args.description !== undefined) updateData.description = args.description;
    if (args.color !== undefined) updateData.color = args.color;
    if (args.parentFolderId !== undefined) updateData.parentFolderId = args.parentFolderId;

    return await ctx.db.patch(folder._id, updateData);
  },
});

// Delete folder (must be empty)
export const deleteFolder = mutation({
  args: { folderId: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    const folder = await ctx.db
      .query("folders")
      .filter((q) => 
        q.and(
          q.eq(q.field("id"), args.folderId),
          q.eq(q.field("userId"), args.userId)
        )
      )
      .first();

    if (!folder) {
      throw new Error("Folder not found");
    }

    // Check if folder has documents
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
      .first();

    if (documents) {
      throw new Error("Cannot delete folder that contains documents");
    }

    // Check if folder has subfolders
    const subfolders = await ctx.db
      .query("folders")
      .withIndex("by_parent", (q) => q.eq("parentFolderId", args.folderId))
      .first();

    if (subfolders) {
      throw new Error("Cannot delete folder that contains subfolders");
    }

    await ctx.db.delete(folder._id);
    return { success: true };
  },
});

// Move document to folder
export const moveDocumentToFolder = mutation({
  args: {
    documentId: v.string(),
    userId: v.string(),
    folderId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const document = await ctx.db
      .query("documents")
      .filter((q) => 
        q.and(
          q.eq(q.field("id"), args.documentId),
          q.eq(q.field("userId"), args.userId)
        )
      )
      .first();

    if (!document) {
      throw new Error("Document not found");
    }

    // Verify folder exists if specified
    if (args.folderId) {
      const folder = await ctx.db
        .query("folders")
        .filter((q) => 
          q.and(
            q.eq(q.field("id"), args.folderId),
            q.eq(q.field("userId"), args.userId)
          )
        )
        .first();

      if (!folder) {
        throw new Error("Target folder not found");
      }
    }

    return await ctx.db.patch(document._id, {
      folderId: args.folderId,
      updatedAt: Date.now()
    });
  },
});

// Get folder breadcrumb path
export const getFolderPath = query({
  args: { folderId: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    const path: { id: string; name: string }[] = [];
    let currentId = args.folderId;

    while (currentId) {
      const folder = await ctx.db
        .query("folders")
        .filter((q) => 
          q.and(
            q.eq(q.field("id"), currentId),
            q.eq(q.field("userId"), args.userId)
          )
        )
        .first();

      if (!folder) break;

      path.unshift({ id: folder.id, name: folder.name });
      currentId = folder.parentFolderId || null;
    }

    return path;
  },
});