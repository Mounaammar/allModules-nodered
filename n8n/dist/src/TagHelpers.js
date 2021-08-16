"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeRelations = exports.createRelations = exports.getTagsWithCountDb = exports.throwDuplicateEntryError = exports.validateTag = exports.sortByRequestOrder = void 0;
const typeorm_1 = require("typeorm");
const class_validator_1 = require("class-validator");
const _1 = require(".");
function sortByRequestOrder(tagsDb, tagIds) {
    const tagMap = tagsDb.reduce((acc, tag) => {
        tag.id = tag.id.toString();
        acc[tag.id] = tag;
        return acc;
    }, {});
    return tagIds.map(tagId => tagMap[tagId]);
}
exports.sortByRequestOrder = sortByRequestOrder;
async function validateTag(newTag) {
    const errors = await class_validator_1.validate(newTag);
    if (errors.length) {
        const validationErrorMessage = Object.values(errors[0].constraints)[0];
        throw new _1.ResponseHelper.ResponseError(validationErrorMessage, undefined, 400);
    }
}
exports.validateTag = validateTag;
function throwDuplicateEntryError(error) {
    const errorMessage = error.message.toLowerCase();
    if (errorMessage.includes('unique') || errorMessage.includes('duplicate')) {
        throw new _1.ResponseHelper.ResponseError('Tag name already exists', undefined, 400);
    }
    throw new _1.ResponseHelper.ResponseError(errorMessage, undefined, 400);
}
exports.throwDuplicateEntryError = throwDuplicateEntryError;
function getTagsWithCountDb(tablePrefix) {
    return typeorm_1.getConnection()
        .createQueryBuilder()
        .select(`${tablePrefix}tag_entity.id`, 'id')
        .addSelect(`${tablePrefix}tag_entity.name`, 'name')
        .addSelect(`COUNT(${tablePrefix}workflows_tags.workflowId)`, 'usageCount')
        .from(`${tablePrefix}tag_entity`, 'tag_entity')
        .leftJoin(`${tablePrefix}workflows_tags`, 'workflows_tags', `${tablePrefix}workflows_tags.tagId = tag_entity.id`)
        .groupBy(`${tablePrefix}tag_entity.id`)
        .getRawMany()
        .then(tagsWithCount => {
        tagsWithCount.forEach(tag => {
            tag.id = tag.id.toString();
            tag.usageCount = Number(tag.usageCount);
        });
        return tagsWithCount;
    });
}
exports.getTagsWithCountDb = getTagsWithCountDb;
function createRelations(workflowId, tagIds, tablePrefix) {
    return typeorm_1.getConnection()
        .createQueryBuilder()
        .insert()
        .into(`${tablePrefix}workflows_tags`)
        .values(tagIds.map(tagId => ({ workflowId, tagId })))
        .execute();
}
exports.createRelations = createRelations;
function removeRelations(workflowId, tablePrefix) {
    return typeorm_1.getConnection()
        .createQueryBuilder()
        .delete()
        .from(`${tablePrefix}workflows_tags`)
        .where('workflowId = :id', { id: workflowId })
        .execute();
}
exports.removeRelations = removeRelations;
//# sourceMappingURL=TagHelpers.js.map