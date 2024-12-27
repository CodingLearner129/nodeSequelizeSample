import config from "../config/config.js";
import db from "./../config/db.js";

export const getUser = async (req, res) => {
    // const transaction = await db.sequelize.transaction(); // Start transaction
    try {
        const result = await db.User.findOne({ id: id });
        // await transaction.commit();
        res.send({
            status: 1,
            message: "User found successfully.",
            data: result || {}
        });
    } catch (error) {
        console.log(error);
        
        // await transaction.rollback();
        res.send({
            status: 0,
            message: "Something went wrong. Please try again later."
        });
    }
}
