export const createOne = async (Model, data, req = {}, transaction = null) => {
    try {
        return await Model.create(data, {...(transaction ? { transaction } : {})});
    } catch (error) {
        throw error;
    }
};

export const bulkCreate = async (Model, data, req = {}) => {
    try {
        return await Model.bulkCreate(data); // Sequelize's bulkCreate method
    } catch (error) {
        throw error;
    }
};

export const update = async (Model, where, data, req = {}, transaction = null) => {
    try {
        return await Model.update(data, { where, ...(transaction ? { transaction } : {}) });
    } catch (error) {
        throw error;
    }
};

export const getOneAndUpdate = async (Model, where, data, req = {}) => {
    try {
        await Model.update(data, { where, ...(transaction ? { transaction } : {}) });
        return await Model.findOne({ where });
    } catch (error) {
        throw error;
    }
};

export const getOne = async (Model, where, req = {}) => {
    try {
        return await Model.findOne({ where });
    } catch (error) {
        throw error;
    }
};

export const getOneById = async (Model, id, req = {}) => {
    try {
        return await Model.findByPk(id);
    } catch (error) {
        throw error;
    }
};

export const getOneAndDelete = async (Model, where, req = {}, transaction = null) => {
    try {
        return await Model.destroy({ where, ...(transaction ? { transaction } : {}) });
    } catch (error) {
        throw error;
    }
};

export const updateOne = async (Model, where, data, req = {}, transaction = null) => {
    try {
        return await Model.update(data, { where, ...(transaction ? { transaction } : {}) });
    } catch (error) {
        throw error;
    }
};

export const updateOrInsert = async (Model, data, req = {}, transaction = null) => {
    try {
        return await Model.upsert(data, { ...(transaction ? { transaction } : {}) });
    } catch (error) {
        throw error;
    }
};

export const getAll = async (Model, where, req = {}) => {
    try {
        return await Model.findAll({ ...where });
    } catch (error) {
        throw error;
    }
};

export const findOne = async (Model, where, req = {}) => {
    try {
        return await Model.findOne({ ...where });
    } catch (error) {
        throw error;
    }
};