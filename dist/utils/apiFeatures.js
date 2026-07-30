"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSearch = exports.getPagination = void 0;
const getPagination = (query) => {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};
exports.getPagination = getPagination;
const getSearch = (query, field) => {
    if (!query.search)
        return {};
    return {
        [field]: {
            $regex: query.search,
            $options: "i"
        }
    };
};
exports.getSearch = getSearch;
