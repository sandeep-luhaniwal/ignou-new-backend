export const getPagination = (query: any) => {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit
    return { page, limit, skip }
}

export const getSearch = (query: any, field: string) => {
    if (!query.search) return {}
    return {
        [field]: {
            $regex: query.search,
            $options: "i"
        }
    }
}