import { verifyToken } from "./../services/auth_service.js";
import db from "../models/index.js";

export const authenticationMemberMiddleware = async (req, res, next) => {
    try {
        const token = req.headers['x-access-token'];
        if (!token) {
            return res.send({
                status: 0,
                message: "No token provided.",
            });
        } else {
            const decoded = await verifyToken(token);
            const getUser = await db.User.findOne({ id: decoded.id, auth_token: token }, req);
            if (getUser != null) {
                if (getUser.blocked_at > 0) {
                    return res.send({
                        status: 0,
                        message: "Your account is blocked.",
                    });
                } else if (getUser.deleted_at > 0) {
                    return res.send({
                        status: 0,
                        message: "Your account is deleted.",
                    });
                } else {
                    req.user = getUser;
                    next();
                }
            } else {
                return res.send({
                    status: 0,
                    message: "Account does not exist.",
                });
            }
        }
    } catch (error) {
        return res.send({
            status: 0,
            message: "Your session has expired. Please sign in again.",
        });
    }
}