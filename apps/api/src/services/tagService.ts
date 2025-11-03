import { db } from '@search-hub/db';
import {
    AppError,
    type TagType,
    type TagListItemType,
    type ListTagsQueryType,
    type CreateTagRequestType,
    type UpdateTagRequestType,
} from '@search-hub/schemas';

/**
 * Helper: Convert database Tag to schema TagType (Date -> ISO string)
 */
function toTagType(tag: {
    id: string;
    tenantId: string;
    name: string;
    color: string | null;
    description: string | null;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
}): TagType {
    return {
        id: tag.id,
        tenantId: tag.tenantId,
        name: tag.name,
        color: tag.color,
        description: tag.description,
        createdById: tag.createdById,
        createdAt: tag.createdAt.toISOString(),
        updatedAt: tag.updatedAt.toISOString(),
    };
}

/**
 * Helper: Convert database Tag to TagListItemType (for lists/filters)
 */
function toTagListItem(tag: {
    id: string;
    name: string;
    color: string | null;
    _count?: { documentTags: number };
}): TagListItemType {
    return {
        id: tag.id,
        name: tag.name,
        color: tag.color,
        documentCount: tag._count?.documentTags,
    };
}

export interface TagService {
    findTagByIdWithCount: (
        tagId: string,
        context: { tenantId: string }
    ) => Promise<{ tag: TagType; documentCount: number }>;
    listTags: (
        options: ListTagsQueryType,
        context: { tenantId: string }
    ) => Promise<{ tags: TagListItemType[]; total: number }>;
    createTag: (
        data: CreateTagRequestType,
        context: { tenantId: string; userId: string }
    ) => Promise<TagType>;
    updateTag: (
        tagId: string,
        data: UpdateTagRequestType,
        context: { tenantId: string; userId: string }
    ) => Promise<TagType>;
    deleteTag: (
        tagId: string,
        context: { tenantId: string; userId: string }
    ) => Promise<void>;
}

export function createTagService(): TagService {
    // Service methods
    async function findTagByIdWithCount(
        tagId: string,
        context: { tenantId: string }
    ): Promise<{ tag: TagType; documentCount: number }> {
        const tag = await db.tag.findByIdWithCount(tagId, context.tenantId);
        if (!tag) {
            throw AppError.notFound('TAG_NOT_FOUND', 'Tag not found', {
                context: {
                    origin: 'app',
                    domain: 'tags',
                    resource: 'Tag',
                    resourceId: tagId,
                    operation: 'get',
                },
            });
        }
        return {
            tag: toTagType(tag),
            documentCount: tag._count.documentTags,
        };
    }
    async function listTags(
        options: ListTagsQueryType,
        context: { tenantId: string }
    ): Promise<{ tags: TagListItemType[]; total: number }> {
        const tags = await db.tag.listTags(context.tenantId, options);
        return {
            tags: tags.map(toTagListItem),
            total: tags.length,
        };
    }
    async function createTag(
        data: CreateTagRequestType,
        context: { tenantId: string; userId: string }
    ): Promise<TagType> {
        // Check permissions - only owners/admins can create tags
        const membership =
            await db.tenantMembership.findMembershipByUserIdAndTenantId({
                userId: context.userId,
                tenantId: context.tenantId,
            });

        if (!membership || membership.role === 'member') {
            throw AppError.authorization(
                'TAG_CREATE_FORBIDDEN',
                'Only owners and admins can create tags',
                {
                    context: {
                        origin: 'app',
                        domain: 'tags',
                        resource: 'Tag',
                        operation: 'create',
                    },
                }
            );
        }

        const tag = await db.tag.createTag({
            tenantId: context.tenantId,
            userId: context.userId,
            ...data,
        });
        return toTagType(tag);
    }

    async function updateTag(
        tagId: string,
        data: UpdateTagRequestType,
        context: { tenantId: string; userId: string }
    ): Promise<TagType> {
        // Check permissions - only owners/admins can update tags
        const membership =
            await db.tenantMembership.findMembershipByUserIdAndTenantId({
                userId: context.userId,
                tenantId: context.tenantId,
            });

        if (!membership || membership.role === 'member') {
            throw AppError.authorization(
                'TAG_UPDATE_FORBIDDEN',
                'Only owners and admins can update tags',
                {
                    context: {
                        origin: 'app',
                        domain: 'tags',
                        resource: 'Tag',
                        resourceId: tagId,
                        operation: 'update',
                    },
                }
            );
        }

        const tag = await db.tag.updateTag({
            tagId,
            tenantId: context.tenantId,
            ...data,
        });
        if (!tag) {
            throw AppError.notFound('TAG_NOT_FOUND', 'Tag not found', {
                context: {
                    origin: 'app',
                    domain: 'tags',
                    resource: 'Tag',
                    resourceId: tagId,
                    operation: 'update',
                },
            });
        }
        return toTagType(tag);
    }

    async function deleteTag(
        tagId: string,
        context: { tenantId: string; userId: string }
    ): Promise<void> {
        // Check permissions - only owners/admins can delete tags
        const membership =
            await db.tenantMembership.findMembershipByUserIdAndTenantId({
                userId: context.userId,
                tenantId: context.tenantId,
            });

        if (!membership || membership.role === 'member') {
            throw AppError.authorization(
                'TAG_DELETE_FORBIDDEN',
                'Only owners and admins can delete tags',
                {
                    context: {
                        origin: 'app',
                        domain: 'tags',
                        resource: 'Tag',
                        resourceId: tagId,
                        operation: 'delete',
                    },
                }
            );
        }

        const deleted = await db.tag.deleteTag(tagId, context.tenantId);
        if (!deleted) {
            throw AppError.notFound('TAG_NOT_FOUND', 'Tag not found', {
                context: {
                    origin: 'app',
                    domain: 'tags',
                    resource: 'Tag',
                    resourceId: tagId,
                    operation: 'delete',
                },
            });
        }
    }

    return {
        findTagByIdWithCount,
        listTags,
        createTag,
        updateTag,
        deleteTag,
    };
}
