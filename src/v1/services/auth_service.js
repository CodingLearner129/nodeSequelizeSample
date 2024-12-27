import jwt from "jsonwebtoken";
import { literal, Op } from "sequelize";
import moment from "moment";
import config from "../config/config.js";
import db from "./../models/index.js";
import { promisify } from "util";

export const signToken = async (data, expiresIn) => {
    return jwt.sign(data, config.jwt_encryption, { expiresIn });
};

export const verifyToken = async (token) => {
    try {
        return await promisify(jwt.verify)(token, config.jwt_encryption);
    } catch (error) {
        throw error;
    }
};