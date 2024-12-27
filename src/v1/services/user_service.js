import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { literal, Op } from 'sequelize';
import db from "./../models/index.js";
import * as modelService from "./model_service.js";
import { logMessage } from "../helpers/logger.js";
import moment from 'moment';
import { checkPhoneAlreadyExist, sendWhatsAppOTP } from './auth_service.js';
import getMessage from '../helpers/getMessage.js';
import config from '../config/config.js';
import { response } from '../helpers/response.js';
import { GetBanList, getUserBanDetail, UserLogInDTO } from '../dto/user.js';
import { EventDetailDTO, EventListDTO, MyEventListDTO } from '../dto/event.js';
import { getPagination, getPagingData } from '../helpers/pagination.js';
import * as commonService from "./common_service.js";
import crypto from 'crypto';
// import { deleteFilesS3Bucket,deleteFilesS3Bucket } from "../helpers/aws_s3.js";

export const checkEmailAlreadyExist = async (req, edit) => {
    try {
        const condition = {
            email: req.body.email,
            deleted_at: { [Op.eq]: 0 },  // Exclude deleted records
        };

        // User for save profile
        if (edit == 1) {
            condition.id = { [Op.ne]: req.user.id };  // Ensure we're not checking the email for the logged-in user's own ID
        }

        return await modelService.getOne(db.User, condition, req);

    } catch (error) {
        logMessage(error, req);
        throw error;
    }
}

export const saveProfile = async (req) => {
    try {
        const data = req.body;
        const checkEmailExist = await checkEmailAlreadyExist(req, 0);
        if (checkEmailExist) {
            return response(config.http_status_ok, {
                status: config.status_fail,
                message: await getMessage("common.email_already_exist"),
            });
        } else {
            data.profile_completed_at = moment().unix(),
                data.updated_at = moment().unix(),
                delete data.phone;
            delete data.country_code;
            await modelService.update(db.User, {
                id: req.user.id, deleted_at: {
                    [Op.eq]: 0
                }
            }, data);
            res.status(config.http_status_ok).send({
                status: config.status_success,
                message: await getMessage('member.save_profile_successfully'),
            });
        }
    } catch (error) {
        logMessage(error, req);
        throw error;
    }
}

export const memberDetails = async (req) => {
    try {
        return await modelService.getOne(db.User, {
            id: req.user.id,
            deleted_at: {
                [Op.eq]: 0
            }
        }, req);
    } catch (error) {
        logMessage(error, req);
        throw error;
    }
}

export const sendOTPForUpdatePhone = async (req) => {
    try {
        req.body.user_type = "member";
        const checkPhoneExist = await checkPhoneAlreadyExist(req);
        if (checkPhoneExist) {
            return response(config.http_status_ok, {
                status: config.status_fail,
                message: await getMessage("common.phone_already_exist"),
            });
        } else {
            const currentTime = moment().unix();
            const getMemberAlreadyExist = await modelService.getOne(db.User, { id: { [Op.ne]: req.user.id }, country_code: req.body.country_code, phone: req.body.phone, deleted_at: { [Op.eq]: 0 } }, req);
            if (getMemberAlreadyExist) {
                return response(config.http_status_ok, {
                    status: config.status_fail,
                    message: await getMessage("common.phone_already_exist"),
                });
            } else {
                const getUser = await modelService.getOne(db.User, { id: req.user.id, deleted_at: { [Op.eq]: 0 } }, req);
                if (getUser) {
                    if (getUser.country_code == req.body.country_code && getUser.phone == req.body.phone) {
                        return response(config.http_status_ok, {
                            status: config.status_success,
                            message: await getMessage('common.phone_must_not_be_same_as_previous'),
                        });
                    } else {
                        const expiredIn = getUser.otp_expired_at - currentTime;
                        if (expiredIn < 0 && getUser.otp_count >= 2) {
                            // req.body.phoneNumber = `${data.country_code}${data.phone}`.replace("+", "");
                            req.body.otp = Math.floor(100000 + Math.random() * 900000);
                            // const response = await sendWhatsAppOTP(req.body);
                            // if (response) {
                            const updatedRecord = await modelService.update(db.User, { id: getUser.id }, { otp: req.body.otp, otp_count: 0, otp_expired_at: (currentTime + (5 * config.otp_expiration)) }, req);
                            return response(config.http_status_ok, {
                                status: config.status_success,
                                message: await getMessage('common.send_otp_success'),
                                data: {
                                    expiration_time: updatedRecord.otp_expired_at - currentTime
                                }
                            });
                            // } else {
                            //     return response;
                            // }
                        } else if (expiredIn < 0 && getUser.otp_count < 2) {
                            // req.body.phoneNumber = `${data.country_code}${data.phone}`.replace("+", "");
                            req.body.otp = Math.floor(100000 + Math.random() * 900000);
                            // const response = await sendWhatsAppOTP(req.body);
                            // if (response) {
                            const updatedRecord = await modelService.update(db.User, { id: getUser.id }, { otp: req.body.otp, otp_count: literal('otp_count + 1'), otp_expired_at: (currentTime + config.otp_expiration) }, req);

                            return response(config.http_status_ok, {
                                status: config.status_success,
                                message: await getMessage('common.send_otp_success'),
                                data: {
                                    expiration_time: updatedRecord.otp_expired_at - currentTime
                                }
                            });
                            // } else {
                            //     return response;
                            // }
                        } else if (expiredIn > config.otp_expiration) {
                            return response(config.http_status_ok, {
                                status: config.status_success,
                                message: `${await getMessage('common.try_again_for_otp')} ${expiredIn}s`,
                                data: {
                                    expiration_time: expiredIn
                                }
                            });
                        } else {
                            return response(config.http_status_ok, {
                                status: config.status_success,
                                message: `${await getMessage('common.try_again_for_otp')} ${expiredIn}s`,
                                data: {
                                    expiration_time: expiredIn
                                }
                            });
                        }
                    }
                } else {
                    return response(config.http_status_ok, {
                        status: config.status_success,
                        message: await getMessage('common.user_not_found'),
                        data: {
                            expiration_time: expiredIn
                        }
                    });
                }
            }
        }
    } catch (error) {
        logMessage(error, req);
        throw error;
    }
}

export const verifyOTPForUpdatePhone = async (req) => {
    try {
        const currentTime = moment().unix();
        const getUser = await modelService.getOne(db.User, { id: req.user.id }, req);
        if (getUser.deleted_at > 0) {
            return response(config.http_status_ok, {
                status: config.status_fail,
                message: await getMessage('auth.account_deleted'),
            });
        } else {
            if (req.body.otp != 111111) {
                // if (getUser.otp !== req.body.otp) {
                return response(config.http_status_ok, {
                    status: config.status_fail,
                    message: await getMessage('auth.otp_verified_fail'),
                });
            } else {
                const updatedRecord = await modelService.update(db.User, { id: getUser.id }, { country_flag: req.body.country_flag, country_code: req.body.country_code, phone: req.body.phone, updated_at: currentTime, otp: 0, otp_count: 0, otp_expired_at: 0 }, req);
                return response(config.http_status_ok, {
                    status: config.status_success,
                    message: await getMessage('auth.otp_verified_success'),
                    data: new UserLogInDTO(updatedRecord)
                });
            }
        }
    } catch (error) {
        logMessage(error, req);
        throw error;
    }
}

export const taskList = async (req) => {
    try {
        return response(config.http_status_ok, {
            status: config.status_success,
            message: await getMessage('common.data_found'),
            data: {
                allow_notification: req.user.allow_notification
            }
        });
    } catch (error) {
        logMessage(error, req);
        throw error;
    }
}

export const settings = async (req) => {
    try {
        const updatedRecord = await modelService.update(db.User, { id: req.user.id }, { allow_notification: req.body.allow_notification }, req);
        return response(config.http_status_ok, {
            status: config.status_success,
            message: await getMessage('common.data_found'),
            data: new UserLogInDTO(updatedRecord)
        });
    } catch (error) {
        logMessage(error, req);
        throw error;
    }
}

export const getFeaturedEvents = async (req) => {
    try {
        const currentDate = moment().startOf("day").unix(); // Today's date at midnight
        const currentTime = moment().unix(); // Current time in Unix
        const { page, size } = req.body;
        const { limit, offset } = getPagination(page, size);
        const getFeaturedEventList = await modelService.getAll(db.EventOccurrence, {
            where: {
                is_featured: 1, // Only featured event occurrences
                deleted_at: 0,  // Exclude deleted occurrences
                [Op.or]: [
                    {
                        [Op.and]: [
                            { event_start_at: { [Op.gte]: currentTime } }, // Start time is >= current time
                            // { event_end_at: { [Op.lt]: currentTime } }, // End time is >= current time
                            { event_start_date: { [Op.gte]: moment().format("YYYY-MM-DD") } }, // Today's date or later
                            { recurring: 0 }, // Non-recurring events
                        ],
                    },
                    {
                        [Op.and]: [
                            { event_start_at: { [Op.gte]: currentTime } }, // Start time is >= current time
                            // { event_end_at: { [Op.lt]: currentTime } }, // End time is >= current time
                            { event_start_date: { [Op.gte]: moment().format("YYYY-MM-DD") } }, // Today's date or later
                            { event_start_date: { [Op.gte]: moment().startOf("month").format("YYYY-MM-DD") } }, // Within the current month
                            { recurring: 1 }, // Recurring events
                        ],
                    },
                ],
            },
            include: [
                {
                    model: db.Event,
                    where: {
                        is_featured: 1, // Also ensure the main event is featured
                        deleted_at: 0,  // Exclude deleted events
                    },
                    required: true, // Ensures only matching events are included
                    include: [
                        {
                            model: db.Organization,
                            attributes: ['id', 'organization_name'],
                            where: {
                                deleted_at: 0,  // Exclude deleted events
                            },
                            required: true, // Ensures only matching events are included
                        },
                        {
                            model: db.Brand,
                            where: {
                                deleted_at: 0,  // Exclude deleted events
                            },
                            required: true, // Ensures only matching events are included
                        },
                        {
                            model: db.Branch,
                            where: {
                                deleted_at: 0,  // Exclude deleted events
                            },
                            required: true, // Ensures only matching events are included
                        },
                        {
                            model: db.Category,
                            where: {
                                deleted_at: 0,  // Exclude deleted events
                            },
                            required: true, // Ensures only matching events are included
                        },
                        {
                            model: db.City,
                            where: {
                                deleted_at: 0,  // Exclude deleted events
                            },
                            required: true, // Ensures only matching events are included
                        },
                        {
                            model: db.SubCity,
                            where: {
                                deleted_at: 0,  // Exclude deleted events
                            },
                            required: true, // Ensures only matching events are included
                        },
                        // {
                        //     model: db.FavoriteEvent,
                        //     required: false, // LEFT OUTER JOIN
                        //     where: {
                        //         user_id: req.user.id,
                        //         user_type: { [Op.ne]: "organization" },
                        //         deleted_at: 0,  // Exclude deleted events
                        //     },
                        // },
                    ],
                },
                {
                    model: db.FavoriteEvent,
                    required: false, // LEFT OUTER JOIN
                    where: {
                        user_id: req.user.id,
                        user_type: { [Op.ne]: "organization" },
                        deleted_at: 0,  // Exclude deleted events
                    },
                },
            ],
            order: [["event_start_at", "ASC"]], // Sort by event start time
            limit: parseInt(limit),    // Limit number of records per page
            offset: parseInt(offset),  // Skip records to implement pagination 
            // group: ['event_id'],
        },
            req);
        return response(config.http_status_ok, {
            status: config.status_success,
            message: await getMessage('common.events_list_success'),
            data: new EventListDTO(getFeaturedEventList, await db.Event.count({
                where: {
                    is_featured: 1, // Only featured event occurrences
                    deleted_at: 0,  // Exclude deleted events
                },
                // distinct: true, // Ensure distinct results
                // col: 'id', // Count distinct `Event` IDs
                include: [
                    {
                        model: db.EventOccurrence,
                        where: {
                            is_featured: 1, // Only featured event occurrences
                            deleted_at: 0,  // Exclude deleted occurrences
                            [Op.or]: [
                                {
                                    [Op.and]: [
                                        { event_start_at: { [Op.gte]: currentTime } }, // Start time is >= current time
                                        // { event_end_at: { [Op.lt]: currentTime } }, // End time is >= current time
                                        { event_start_date: { [Op.gte]: moment().format("YYYY-MM-DD") } }, // Today's date or later
                                        { recurring: 0 }, // Non-recurring events
                                    ],
                                },
                                {
                                    [Op.and]: [
                                        { event_start_at: { [Op.gte]: currentTime } }, // Start time is >= current time
                                        // { event_end_at: { [Op.lt]: currentTime } }, // End time is >= current time
                                        { event_start_date: { [Op.gte]: moment().format("YYYY-MM-DD") } }, // Today's date or later
                                        { event_start_date: { [Op.gte]: moment().startOf("month").format("YYYY-MM-DD") } }, // Within the current month
                                        { recurring: 1 }, // Recurring events
                                    ],
                                },
                            ],
                        },
                        required: true
                    }
                ]
            }))
        });
    } catch (error) {
        logMessage(error, req);
        throw error;
    }
}

export const getEventList = async (req) => {
    try {
        const currentTime = moment().unix(); // Current time in Unix
        const startOfMonth = moment().startOf('month').format('YYYY-MM-DD');
        const endOfMonth = moment().endOf('month').format('YYYY-MM-DD');
        const startOfWeek = moment().startOf('week').format('YYYY-MM-DD');
        const endOfWeek = moment().endOf('week').format('YYYY-MM-DD');
        const { page, size } = req.body;
        const { limit, offset } = getPagination(page, size);

        const getEventListData = await modelService.getAll(db.EventOccurrence, {
            where: { // 1 = today, 2 = this week, 3 = this month
                deleted_at: 0,  // Exclude deleted occurrences
                [Op.and]: [
                    // ...(req?.body?.default == 1 ? [{ event_start_at: { [Op.gte]: currentTime } }] : []), // Start time is >= current time
                    // ...(req?.body?.default == 2 ? [{ event_end_at: { [Op.lt]: currentTime } }] : []), // End time is >= current time
                    ...(req?.body?.default == 2 ? [{ event_start_date: { [Op.lte]: moment().format("YYYY-MM-DD") } }] : []), // End time is >= current time
                    ...(req?.body?.when == 1 ? [{ event_start_date: { [Op.eq]: moment().format("YYYY-MM-DD") } }] : []), // Today's date
                    ...(req?.body?.when == 2 ? [{ event_start_date: { [Op.between]: [startOfWeek, endOfWeek] } }] : []), // Events in this week
                    ...(req?.body?.when == 3 ? [{ event_start_date: { [Op.between]: [startOfMonth, endOfMonth] } }] : []), // Events in this month
                    ...(req?.body?.date != "" ? [{ event_start_date: { [Op.eq]: req.body.date } }] : []), // Events in this month
                    ...(req?.body?.default == 1 ? [{ event_start_date: { [Op.gte]: moment().format("YYYY-MM-DD") } }] : []), // latest Events
                ],
            },
            include: [
                {
                    model: db.Event,
                    where: {
                        ...(req?.body?.event_name != "" ? { event_name: { [Op.like]: `%${req?.body?.event_name ?? ""}%` } } : {}), // Partial match for event_name
                        ...(req?.body?.category_ids.length > 0 ? { category_id: { [Op.in]: req.body.category_ids } } : {}),
                        ...(req?.body?.city_ids.length > 0 ? { city_id: { [Op.in]: req.body.city_ids } } : {}),
                        ...(req?.body?.sub_city_ids.length > 0 ? { sub_city_id: { [Op.in]: req.body.sub_city_ids } } : {}),
                        deleted_at: 0,  // Exclude deleted events
                    },
                    required: true, // Ensures only matching events are included
                    include: [
                        {
                            model: db.Organization,
                            attributes: ['id', 'organization_name'],
                            where: {
                                deleted_at: 0,  // Exclude deleted events
                            },
                            required: true, // Ensures only matching events are included
                        },
                        {
                            model: db.Brand,
                            where: {
                                deleted_at: 0,  // Exclude deleted events
                            },
                            required: true, // Ensures only matching events are included
                        },
                        {
                            model: db.Branch,
                            where: {
                                deleted_at: 0,  // Exclude deleted events
                            },
                            required: true, // Ensures only matching events are included
                        },
                        {
                            model: db.Category,
                            where: {
                                deleted_at: 0,  // Exclude deleted events
                            },
                            required: true, // Ensures only matching events are included
                        },
                        {
                            model: db.City,
                            where: {
                                deleted_at: 0,  // Exclude deleted events
                            },
                            required: true, // Ensures only matching events are included
                        },
                        {
                            model: db.SubCity,
                            where: {
                                deleted_at: 0,  // Exclude deleted events
                            },
                            required: true, // Ensures only matching events are included
                        },
                        {
                            model: db.DressCode,
                            where: {
                                deleted_at: 0,  // Exclude deleted events
                            },
                            required: true, // Ensures only matching events are included
                        },
                        // {
                        //     model: db.FavoriteEvent,
                        //     required: false, // LEFT OUTER JOIN
                        //     where: {
                        //         user_id: req.user.id,
                        //         user_type: { [Op.ne]: "organization" },
                        //         deleted_at: 0,  // Exclude deleted events
                        //     },
                        // },
                    ],
                },
                {
                    model: db.FavoriteEvent,
                    required: false, // LEFT OUTER JOIN
                    where: {
                        user_id: req.user.id,
                        user_type: req.user_type == "organization" ? { [Op.eq]: "organization" } : { [Op.ne]: "organization" },
                        deleted_at: 0,  // Exclude deleted events
                    },
                },
            ],
            order: [["event_start_at", "ASC"]], // Sort by event start time
            limit: parseInt(limit),    // Limit number of records per page
            offset: parseInt(offset),  // Skip records to implement pagination
            // group: ['event_id'],
        }, req);
        console.log(getEventListData);

        return response(config.http_status_ok, {
            status: config.status_success,
            message: await getMessage('common.events_list_success'),
            data: new EventListDTO(getEventListData, await db.Event.count({
                where: {
                    ...(req?.body?.event_name != "" ? { event_name: { [Op.like]: `%${req?.body?.event_name ?? ""}%` } } : {}), // Partial match for event_name
                    ...(req?.body?.category_ids.length > 0 ? { category_id: { [Op.in]: req.body.category_ids } } : {}),
                    ...(req?.body?.city_ids.length > 0 ? { city_id: { [Op.in]: req.body.city_ids } } : {}),
                    ...(req?.body?.sub_city_ids.length > 0 ? { sub_city_id: { [Op.in]: req.body.sub_city_ids } } : {}),
                    deleted_at: 0,  // Exclude deleted events
                },
                // distinct: true, // Ensure distinct results
                // col: 'id', // Count distinct `Event` IDs
                include: [
                    {
                        model: db.EventOccurrence,
                        where: { // 1 = today, 2 = this week, 3 = this month
                            deleted_at: 0,  // Exclude deleted occurrences
                            [Op.and]: [
                                // ...(req?.body?.default == 1 ? [{ event_start_at: { [Op.gte]: currentTime } }] : []), // Start time is >= current time
                                // ...(req?.body?.default == 2 ? [{ event_end_at: { [Op.lt]: currentTime } }] : []), // End time is >= current time
                                ...(req?.body?.default == 2 ? [{ event_start_date: { [Op.lte]: moment().format("YYYY-MM-DD") } }] : []), // End time is >= current time
                                ...(req?.body?.when == 1 ? [{ event_start_date: { [Op.eq]: moment().format("YYYY-MM-DD") } }] : []), // Today's date
                                ...(req?.body?.when == 2 ? [{ event_start_date: { [Op.between]: [startOfWeek, endOfWeek] } }] : []), // Events in this week
                                ...(req?.body?.when == 3 ? [{ event_start_date: { [Op.between]: [startOfMonth, endOfMonth] } }] : []), // Events in this month
                                ...(req?.body?.date != "" ? [{ event_start_date: { [Op.eq]: req.body.date } }] : []), // Events in this month
                                ...(req?.body?.default == 1 ? [{ event_start_date: { [Op.gte]: moment().format("YYYY-MM-DD") } }] : []), // latest Events
                            ],
                        },
                        required: true
                    }
                ]
            }))
        });
    } catch (error) {
        logMessage(error, req);
        throw error;
    }
}

export const getFavoriteEventList = async (req) => {
    try {
        const currentTime = moment().unix(); // Current time in Unix
        const startOfMonth = moment().startOf('month').format('YYYY-MM-DD');
        const endOfMonth = moment().endOf('month').format('YYYY-MM-DD');
        const startOfWeek = moment().startOf('week').format('YYYY-MM-DD');
        const endOfWeek = moment().endOf('week').format('YYYY-MM-DD');
        const { page, size } = req.body;
        const { limit, offset } = getPagination(page, size);
        req.body.type = 3;
        const getMyEventListData = await modelService.getAll(db.EventOccurrence, {
            where: { // when 1 = today, 2 = this week, 3 = this month //type 1 = upcoming 2 = past 3 = favorite
                deleted_at: 0,  // Exclude deleted occurrences
                [Op.and]: [
                    // ...(req?.body?.type == 1 ? [{ event_start_at: { [Op.gte]: currentTime } }] : []), // Start time is >= current time
                    ...(req?.body?.when == 1 ? [{ event_start_date: { [Op.eq]: moment().format("YYYY-MM-DD") } }] : []), // Today's date
                    ...(req?.body?.when == 2 ? [{ event_start_date: { [Op.between]: [startOfWeek, endOfWeek] } }] : []), // Events in this week
                    ...(req?.body?.when == 3 ? [{ event_start_date: { [Op.between]: [startOfMonth, endOfMonth] } }] : []), // Events in this month
                    ...(req?.body?.date != "" ? [{ event_start_date: { [Op.eq]: req.body.date } }] : []), // Events in this month
                    // ...(req?.body?.type == 1 ? [{ event_start_date: { [Op.gte]: moment().format("YYYY-MM-DD") } }] : []), // latest Events
                    // ...(req?.body?.type == 2 ? [{ event_start_date: { [Op.lt]: moment().format("YYYY-MM-DD") } }] : []), // latest Events
                ],
            },
            include: [
                {
                    model: db.Event,
                    where: {
                        ...(req?.body?.event_name != "" ? { event_name: { [Op.like]: `%${req?.body?.event_name ?? ""}%` } } : {}), // Partial match for event_name
                        ...(req?.body?.category_ids.length > 0 ? { category_id: { [Op.in]: req.body.category_ids } } : {}),
                        ...(req?.body?.city_ids.length > 0 ? { city_id: { [Op.in]: req.body.city_ids } } : {}),
                        ...(req?.body?.sub_city_ids.length > 0 ? { sub_city_id: { [Op.in]: req.body.sub_city_ids } } : {}),
                        deleted_at: 0,  // Exclude deleted events
                    },
                    include: [
                        {
                            model: db.Organization,
                            attributes: ['id', 'organization_name'],
                            where: {
                                deleted_at: 0,  // Exclude deleted events
                            },
                            required: true, // Ensures only matching events are included
                        },
                        {
                            model: db.Brand,
                            where: {
                                deleted_at: 0,  // Exclude deleted events
                            },
                            required: true, // Ensures only matching events are included
                        },
                        {
                            model: db.Branch,
                            where: {
                                deleted_at: 0,  // Exclude deleted events
                            },
                            required: true, // Ensures only matching events are included
                        },
                        {
                            model: db.Category,
                            where: {
                                deleted_at: 0,  // Exclude deleted events
                            },
                            required: true, // Ensures only matching events are included
                        },
                        {
                            model: db.City,
                            where: {
                                deleted_at: 0,  // Exclude deleted events
                            },
                            required: true, // Ensures only matching events are included
                        },
                        {
                            model: db.SubCity,
                            where: {
                                deleted_at: 0,  // Exclude deleted events
                            },
                            required: true, // Ensures only matching events are included
                        },
                        {
                            model: db.DressCode,
                            where: {
                                deleted_at: 0,  // Exclude deleted events
                            },
                            required: true, // Ensures only matching events are included
                        },
                        // {
                        //     model: db.Attendee,
                        //     where: {
                        //         user_id: req.user.id,
                        //         interested_at: { [Op.gt]: 0 },
                        //         interest_canceled_at: 0,
                        //         // ...(req?.body?.type == 1 ? { attended_at: 0 } : {}),
                        //         // ...(req?.body?.type == 2 ? { attended_at: { [Op.gt]: 0 } } : {}),
                        //         deleted_at: 0,  // Exclude deleted events
                        //     },
                        //     required: (req?.body?.type == 3 ? false : true), // LEFT OUTER JOIN
                        // },
                        // {
                        //     model: db.FavoriteEvent,
                        //     where: {
                        //         user_id: req.user.id,
                        //         user_type: { [Op.ne]: "organization" },
                        //         deleted_at: 0,  // Exclude deleted events
                        //     },
                        //     required: (req?.body?.type == 3 ? true : false), // LEFT OUTER JOIN
                        // },
                    ],
                    required: true, // Ensures only matching events are included
                },
                {
                    model: db.FavoriteEvent,
                    where: {
                        user_id: req.user.id,
                        user_type: req.user_type == "organization" ? { [Op.eq]: "organization" } : { [Op.ne]: "organization" },
                        deleted_at: 0,  // Exclude deleted events
                    },
                    required: (req?.body?.type == 3 ? true : false), // LEFT OUTER JOIN
                },
                {
                    model: db.Attendee,
                    where: {
                        user_id: req.user.id,
                        interested_at: { [Op.gt]: 0 },
                        interest_canceled_at: 0,
                        deleted_at: 0,  // Exclude deleted events
                    },
                    required: (req?.body?.type == 3 ? false : true), // LEFT OUTER JOIN
                },
            ],
            order: [req?.body?.type == 1 ? ["event_start_at", "ASC"] : ["event_start_at", "DESC"]], // Sort by event start time
            limit: parseInt(limit),    // Limit number of records per page
            offset: parseInt(offset),  // Skip records to implement pagination
        }, req);
        return response(config.http_status_ok, {
            status: config.status_success,
            message: await getMessage('common.events_list_success'),
            data: new MyEventListDTO(getMyEventListData)
        });
    } catch (error) {
        logMessage(error, req);
        throw error;
    }
}

export const getEventDetail = async (req) => {
    try {
        const getEvent = await modelService.findOne(db.Event, {
            where: {
                id: req.body.event_id,
                deleted_at: 0,  // Exclude deleted events
            },
            include: [
                {
                    model: db.EventOccurrence,
                    where: { // when 1 = today, 2 = this week, 3 = this month //type 1 = upcoming 2 = past 3 = favorite
                        deleted_at: 0,  // Exclude deleted occurrences
                        [Op.or]: [
                            {
                                [Op.and]: [
                                    ...(req?.body?.event_occurrence_id != 0 ? [{ id: req?.body?.event_occurrence_id }] : []),
                                    { recurring: 0 }, // Non-recurring events
                                ],
                            },
                            {
                                [Op.and]: [
                                    ...(req?.body?.event_occurrence_id != 0 ? [{ id: req?.body?.event_occurrence_id }] : []),
                                    ...(req?.body?.event_occurrence_id == 0 ? [{ event_start_date: { [Op.gte]: moment().startOf("month").format("YYYY-MM-DD") } }] : []), // Within the current month
                                    { recurring: 1 }, // Recurring events
                                ],
                            },
                        ],
                    },
                    include: [
                        {
                            model: db.Attendee,
                            where: {
                                user_id: req.user.id,
                                interested_at: { [Op.gt]: 0 },
                                interest_canceled_at: 0,
                                deleted_at: 0,  // Exclude deleted events
                            },
                            required: false, // LEFT OUTER JOIN
                        },
                        {
                            model: db.FavoriteEvent,
                            where: {
                                user_id: req.user.id,
                                user_type: { [Op.ne]: "organization" },
                                deleted_at: 0,  // Exclude deleted events
                            },
                            required: false, // LEFT OUTER JOIN
                        },
                    ],
                    required: true, // Ensures only matching events are included
                },
                {
                    model: db.Organization,
                    attributes: ['id', 'organization_name'],
                    where: {
                        deleted_at: 0,  // Exclude deleted events
                    },
                    required: true, // Ensures only matching events are included
                },
                {
                    model: db.Brand,
                    where: {
                        deleted_at: 0,  // Exclude deleted events
                    },
                    required: true, // Ensures only matching events are included
                },
                {
                    model: db.Branch,
                    where: {
                        deleted_at: 0,  // Exclude deleted events
                    },
                    required: true, // Ensures only matching events are included
                },
                {
                    model: db.Category,
                    where: {
                        deleted_at: 0,  // Exclude deleted events
                    },
                    required: true, // Ensures only matching events are included
                },
                {
                    model: db.City,
                    where: {
                        deleted_at: 0,  // Exclude deleted events
                    },
                    required: true, // Ensures only matching events are included
                },
                {
                    model: db.SubCity,
                    where: {
                        deleted_at: 0,  // Exclude deleted events
                    },
                    required: true, // Ensures only matching events are included
                },
                {
                    model: db.DressCode,
                    where: {
                        deleted_at: 0,  // Exclude deleted events
                    },
                    required: true, // Ensures only matching events are included
                },
            ],
            order: [req?.body?.type == 1 ? ["event_start_at", "ASC"] : ["event_start_at", "DESC"]], // Sort by event start time
        }, req);
        return response(config.http_status_ok, {
            status: config.status_success,
            message: await getMessage('common.data_found'),
            data: new EventDetailDTO(getEvent)
        });
    } catch (error) {
        logMessage(error, req);
        throw error;
    }
}

export const addInterestToEvent = async (req) => {
    const transaction = await db.sequelize.transaction();
    try {
        if (req.user.banned_at > 0 && req.user.ban_left_at > 0) {
            await transaction.rollback();
            return response(config.http_status_ok, {
                status: config.status_ban,
                message: await getMessage('auth.account_blocked'),
            });
        } else {
            const currentTime = moment().unix();
            const getEventOccurrence = await modelService.findOne(db.EventOccurrence, {
                where: {
                    id: req.body.event_occurrence_id,
                    event_id: req.body.event_id,
                    deleted_at: 0,  // Exclude deleted events
                },
                include: [
                    {
                        model: db.Event,
                        required: true,
                        where: {
                            deleted_at: 0
                        }
                    }
                ]
            }, req);
            if (getEventOccurrence) {
                if (getEventOccurrence.event_end_at <= currentTime) {
                    await transaction.rollback();
                    return response(config.http_status_ok, {
                        status: config.status_fail,
                        message: await getMessage('common.event_expired'),
                    });
                } else if (getEventOccurrence.canceled_at > 0) {
                    await transaction.rollback();
                    return response(config.http_status_ok, {
                        status: config.status_fail,
                        message: await getMessage('common.event_canceled'),
                    });
                } else if (getEventOccurrence.availability <= 0) {
                    await transaction.rollback();
                    return response(config.http_status_ok, {
                        status: config.status_fail,
                        message: await getMessage('common.event_no_seat_available'),
                    });
                } else {
                    const getAttended = await modelService.findOne(db.Attendee, {
                        where: {
                            user_id: req.user.id,
                            event_occurrence_id: req.body.event_occurrence_id,
                            event_id: req.body.event_id,
                            interested_at: { [Op.gt]: 0 },
                            interest_canceled_at: 0,
                            deleted_at: 0,  // Exclude deleted events
                        }
                    }, req);
                    if (getAttended) {
                        await transaction.rollback();
                        return response(config.http_status_ok, {
                            status: config.status_success,
                            message: await getMessage('common.event_already_attended'),
                        });
                    } else {
                        // const accessToken = [...Array(100)].map(() => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.charAt(Math.floor(Math.random() * 62))).join('');
                        const accessToken = crypto.randomBytes(50).toString('base64url');
                        const attendEvent = await modelService.createOne(db.Attendee, {
                            user_id: req.user.id,
                            event_occurrence_id: req.body.event_occurrence_id,
                            event_id: req.body.event_id,
                            access_token: accessToken,
                            interested_at: currentTime,
                            created_at: currentTime
                        }, req, transaction);
                        const updatedEventOccurrence = await modelService.update(db.EventOccurrence, {
                            id: req.body.event_occurrence_id,
                            event_id: req.body.event_id,
                        }, {
                            availability: literal('availability - 1'),
                            interested_count: literal('interested_count + 1'),
                            updated_at: currentTime
                        }, req, transaction);
                        const registrationTokens = [];
                        const deviceTypes = [];
                        const notifications = [];
                        // const userNotificationCount = [];

                        // Pre-fetch notification messages
                        const notificationTitle = await getMessage('notification.show_interest.title');
                        const notificationBodyPrefix = req.user.full_name;
                        const notificationBodySuffix = getEventOccurrence.Event.event_name;
                        const notificationBody = `${notificationBodyPrefix}${await getMessage('notification.show_interest.body')}${notificationBodySuffix}.`;

                        registrationTokens.push(req.user.firebase_token);
                        deviceTypes.push(req.user.device_type ?? 2);
                        notifications.push({
                            notification_type: 1,
                            event_id: req.body.event_id,
                            event_occurrence_id: req.body.event_occurrence_id,
                            title: notificationTitle,
                            body: notificationBody,
                            sender_type: "member",
                            sender_id: req.user.id,
                            receiver_type: "organization",
                            receiver_id: getEventOccurrence.Event.created_by,
                            created_at: moment().unix(),
                            updated_at: moment().unix()
                        });
                        if (registrationTokens.length > 0) {
                            const message = {
                                tokens: registrationTokens,
                                deviceTypes: deviceTypes,
                                data: {
                                    title: notificationTitle,
                                    body: notificationBody,
                                    notification_type: "1",
                                    data: JSON.stringify(updatedEventOccurrence)
                                },
                                notification: {
                                    title: notificationTitle,
                                    body: notificationBody,
                                },
                                apns: {
                                    payload: {
                                        aps: {
                                            sound: config.default_sound,
                                            "content-available": 1
                                        }
                                    }
                                }
                            }
                            // await commonService.sendPushNotification(message);
                        }
                        if (notifications.length > 0) {
                            await commonService.addNotifications(notifications, req);
                        }
                        await transaction.commit();
                        return response(config.http_status_ok, {
                            status: config.status_success,
                            message: await getMessage('common.interest_register_success'),
                            data: attendEvent
                        });
                    }
                }
            } else {
                await transaction.rollback();
                return response(config.http_status_ok, {
                    status: config.status_fail,
                    message: await getMessage('common.event_not_exist'),
                });
            }
        }
    } catch (error) {
        logMessage(error, req);
        await transaction.rollback();
        throw error;
    }
}

export const cancelInterestToEvent = async (req) => {
    const transaction = await db.sequelize.transaction();
    try {
        const currentTime = moment().unix();
        const getEventOccurrence = await modelService.findOne(db.EventOccurrence, {
            where: {
                id: req.body.event_occurrence_id,
                event_id: req.body.event_id,
                deleted_at: 0,  // Exclude deleted events
            },
            include: [
                {
                    model: db.Event,
                    required: true,
                    where: {
                        deleted_at: 0
                    }
                }
            ]
        }, req);
        if (getEventOccurrence) {
            if (getEventOccurrence.event_end_at <= currentTime) {
                await transaction.rollback();
                return response(config.http_status_ok, {
                    status: config.status_fail,
                    message: await getMessage('common.event_expired'),
                });
            } else if (getEventOccurrence.canceled_at > 0) {
                await transaction.rollback();
                return response(config.http_status_ok, {
                    status: config.status_fail,
                    message: await getMessage('common.event_canceled'),
                });
            } else {
                const getAttended = await modelService.findOne(db.Attendee, {
                    where: {
                        user_id: req.user.id,
                        event_occurrence_id: req.body.event_occurrence_id,
                        event_id: req.body.event_id,
                        interested_at: { [Op.gt]: 0 },
                        interest_canceled_at: 0,
                        deleted_at: 0,  // Exclude deleted events
                    }
                }, req);
                if (getAttended.interest_canceled_at > 0) {
                    await transaction.rollback();
                    return response(config.http_status_ok, {
                        status: config.status_success,
                        message: await getMessage('common.interest_already_canceled'),
                    });
                } else {
                    await modelService.update(db.Attendee, {
                        id: getAttended.id
                    }, {
                        interest_canceled_at: currentTime,
                    }, req, transaction);
                    await modelService.update(db.EventOccurrence, {
                        id: req.body.event_occurrence_id,
                        event_id: req.body.event_id,
                    }, {
                        availability: literal('availability + 1'),
                        interested_count: literal('interested_count - 1'),
                        updated_at: currentTime
                    }, req, transaction);
                    await transaction.commit();
                    return response(config.http_status_ok, {
                        status: config.status_success,
                        message: await getMessage('common.interest_cancel_success'),
                    });
                }
            }
        } else {
            await transaction.rollback();
            return response(config.http_status_ok, {
                status: config.status_fail,
                message: await getMessage('common.event_not_exist'),
            });
        }
    } catch (error) {
        logMessage(error, req);
        await transaction.rollback();
        throw error;
    }
}

export const getMyEventList = async (req) => {
    try {
        const currentTime = moment().unix(); // Current time in Unix
        const { page, size } = req.body;
        const { limit, offset } = getPagination(page, size);
        const getMyEventListData = await modelService.getAll(db.EventOccurrence, {
            where: { //type 1 = upcoming 2 = past 3 = favorite
                deleted_at: 0,  // Exclude deleted occurrences
                [Op.and]: [
                    ...(req?.body?.type == 1 ? [{ event_start_at: { [Op.gte]: currentTime } }] : []), // Start time is >= current time
                    ...(req?.body?.type == 1 ? [{ event_start_date: { [Op.gte]: moment().format("YYYY-MM-DD") } }] : []), // latest Events
                    ...(req?.body?.type == 2 ? [{ event_start_at: { [Op.lt]: currentTime } }] : []), // past Events
                    ...(req?.body?.default == 2 ? [{ event_start_date: { [Op.lte]: moment().format("YYYY-MM-DD") } }] : []),
                ],
            },
            include: [
                {
                    model: db.Event,
                    where: {
                        deleted_at: 0,  // Exclude deleted events
                    },
                    include: [
                        {
                            model: db.Organization,
                            attributes: ['id', 'organization_name'],
                            where: {
                                deleted_at: 0,  // Exclude deleted events
                            },
                            required: true, // Ensures only matching events are included
                        },
                        {
                            model: db.Brand,
                            where: {
                                deleted_at: 0,  // Exclude deleted events
                            },
                            required: true, // Ensures only matching events are included
                        },
                        {
                            model: db.Branch,
                            where: {
                                deleted_at: 0,  // Exclude deleted events
                            },
                            required: true, // Ensures only matching events are included
                        },
                        {
                            model: db.Category,
                            where: {
                                deleted_at: 0,  // Exclude deleted events
                            },
                            required: true, // Ensures only matching events are included
                        },
                        {
                            model: db.City,
                            where: {
                                deleted_at: 0,  // Exclude deleted events
                            },
                            required: true, // Ensures only matching events are included
                        },
                        {
                            model: db.SubCity,
                            where: {
                                deleted_at: 0,  // Exclude deleted events
                            },
                            required: true, // Ensures only matching events are included
                        },
                        {
                            model: db.DressCode,
                            where: {
                                deleted_at: 0,  // Exclude deleted events
                            },
                            required: true, // Ensures only matching events are included
                        },
                    ],
                    required: true, // Ensures only matching events are included
                },
                {
                    model: db.FavoriteEvent,
                    where: {
                        user_id: req.user.id,
                        user_type: { [Op.ne]: "organization" },
                        deleted_at: 0,  // Exclude deleted events
                    },
                    required: false, // LEFT OUTER JOIN
                },
                {
                    model: db.Attendee,
                    where: {
                        user_id: req.user.id,
                        interested_at: { [Op.gt]: 0 },
                        interest_canceled_at: 0,
                        ...(req?.body?.type == 1 ? { attended_at: 0 } : {}),
                        ...(req?.body?.type == 2 ? { attended_at: { [Op.gt]: 0 } } : {}),
                        deleted_at: 0,  // Exclude deleted events
                    },
                    required: true, // Ensures only matching events are included
                },
            ],
            order: [req?.body?.type == 1 ? ["event_start_at", "ASC"] : ["event_start_at", "DESC"]], // Sort by event start time
            limit: parseInt(limit),    // Limit number of records per page
            offset: parseInt(offset),  // Skip records to implement pagination
        }, req);
        return response(config.http_status_ok, {
            status: config.status_success,
            message: await getMessage('common.events_list_success'),
            data: new MyEventListDTO(getMyEventListData)
        });
    } catch (error) {
        logMessage(error, req);
        throw error;
    }
}

export const getBanList = async (req) => {
    try {
        const { page, size } = req.body;
        const { limit, offset } = getPagination(page, size);
        const getBanListData = await modelService.getAll(db.UserStrike, {
            where: {
                deleted_at: 0,  // Exclude deleted occurrences
                ...(req.user_type == "organization" ? { user_type: "organization" } : { user_type: { [Op.ne]: "organization" } })
            },
            include: [
                {
                    model: db.Event,
                    attributes: ['id', 'event_name'],
                    where: {
                        deleted_at: 0
                    },
                    required: true,
                }
            ],
            order: [["created_at", "DESC"]],
            limit: parseInt(limit),    // Limit number of records per page
            offset: parseInt(offset),  // Skip records to implement pagination
        }, req);
        const getBanDetail = await modelService.findOne(req.user_type == "organization" ? db.Organization : db.User, {
            where: {
                id: req.user.id
            },
            attributes: ["id", "ban_count", "banned_at", "ban_left_at"],
            include: [
                {
                    model: db.UserStrike,
                    where: {
                        ...(req.user_type == "organization" ? { user_type: "organization" } : { user_type: { [Op.ne]: "organization" } }),
                        deleted_at: 0,  // Exclude deleted events
                    },
                    include: [
                        {
                            model: db.Event,
                            attributes: ['id', 'event_name'],
                            where: {
                                deleted_at: 0
                            },
                            required: true,
                        }
                    ],
                    required: true, // Ensures only matching events are included
                    limit: 1, // Fetch only one UserStrike
                }
            ]
        }, req);
        return response(config.http_status_ok, {
            status: config.status_success,
            message: await getMessage('common.events_list_success'),
            data: {
                banDetail: new getUserBanDetail(getBanDetail),
                banList: new GetBanList(getBanListData)
            }
        });
    } catch (error) {
        logMessage(error, req);
        throw error;
    }
}

export const sendOTPEditAccount = async (req) => {
    try {
        const currentTime = moment().unix();
        const getUser = await modelService.getOne(
            req.user_type == "organization" ? db.Organization : db.User,
            {
                id: req.user.id,
                deleted_at: { [Op.eq]: 0 },
            },
            req
        );
        if (getUser) {
            const expiredIn = getUser.otp_expired_at - currentTime;

            if (expiredIn < 0 && getUser.otp_count >= 2) {
                // req.body.phoneNumber = `${data.country_code}${data.phone}`.replace("+", "");
                req.body.otp = Math.floor(100000 + Math.random() * 900000);
                // const response = await sendWhatsAppOTP(req.body);
                // if (response) {
                const updatedRecord = await modelService.update(
                    req.user_type == "organization" ? db.Organization : db.User,
                    { id: getUser.id },
                    {
                        otp: req.body.otp,
                        otp_count: 0,
                        otp_expired_at: currentTime + 5 * config.otp_expiration,
                    },
                    req
                );
                return response(config.http_status_ok, {
                    status: config.status_success,
                    message: await getMessage("common.send_otp_success"),
                    data: {
                        expiration_time: updatedRecord.otp_expired_at - currentTime,
                    },
                });
                // } else {
                //     return response;
                // }
            } else if (expiredIn < 0 && getUser.otp_count < 2) {
                // req.body.phoneNumber = `${data.country_code}${data.phone}`.replace("+", "");
                req.body.otp = Math.floor(100000 + Math.random() * 900000);
                // const response = await sendWhatsAppOTP(req.body);
                // if (response) {
                const updatedRecord = await modelService.update(
                    req.user_type == "organization" ? db.Organization : db.User,
                    { id: getUser.id },
                    {
                        otp: req.body.otp,
                        otp_count: literal("otp_count + 1"),
                        otp_expired_at: currentTime + config.otp_expiration,
                    },
                    req
                );

                return response(config.http_status_ok, {
                    status: config.status_success,
                    message: await getMessage("common.send_otp_success"),
                    data: {
                        expiration_time: updatedRecord.otp_expired_at - currentTime,
                    },
                });
                // } else {
                //     return response;
                // }
            } else if (expiredIn > config.otp_expiration) {
                return response(config.http_status_ok, {
                    status: config.status_success,
                    message: `${await getMessage("common.try_again_for_otp")} ${expiredIn}s`,
                    data: {
                        expiration_time: expiredIn,
                    },
                });
            } else {
                return response(config.http_status_ok, {
                    status: config.status_success,
                    message: `${await getMessage("common.try_again_for_otp")} ${expiredIn}s`,
                    data: {
                        expiration_time: expiredIn,
                    },
                });
            }
        } else {
            return response(config.http_status_ok, {
                status: config.status_fail,
                message: await getMessage("common.user_not_found")
            });
        }
    } catch (error) {
        logMessage(error, req);
        throw error;
    }
}

export const verifyOTPEditAccount = async (req) => {
    try {
        const currentTime = moment().unix();
        const getUser = await modelService.getOne(
            req.user_type == "organization" ? db.Organization : db.User,
            { id: req.user.id, country_code: req.body.country_code, phone: req.body.phone, deleted_at: 0 },
            req
        );
        if (getUser.deleted_at > 0) {
            return response(config.http_status_ok, {
                status: config.status_fail,
                message: await getMessage("auth.account_deleted"),
            });
        } else {
            if (req.body.otp != 111111) {
                // if (getUser.otp !== req.body.otp) {
                return response(config.http_status_ok, {
                    status: config.status_fail,
                    message: await getMessage("auth.otp_verified_fail"),
                });
            } else {
                await modelService.update(
                    req.user_type == "organization" ? db.Organization : db.User,
                    {
                        id: getUser.id,
                    }, {
                    otp: 0,
                    otp_count: 0,
                    otp_expired_at: 0,
                    updated_at: currentTime
                },
                    req
                );
                return response(config.http_status_ok, {
                    status: config.status_success,
                    message: await getMessage("auth.otp_verified_success"),
                });
            }
        }
    } catch (error) {
        logMessage(error, req);
        throw error;
    }
}

export const editProfile = async (req) => {
    try {
        const data = req.body;
        const checkEmailExist = await checkEmailAlreadyExist(req, 0);
        if (checkEmailExist) {
            return response(config.http_status_ok, {
                status: config.status_fail,
                message: await getMessage("common.email_already_exist"),
            });
        } else {
            data.updated_at = moment().unix(),
                delete data.full_name;
            delete data.insta_id;
            delete data.phone;
            delete data.country_code;
            const getUser = await modelService.getOne(
                db.User,
                { id: req.user.id, deleted_at: 0 },
                req
            );
            if (getUser.deleted_at > 0) {
                return response(config.http_status_ok, {
                    status: config.status_fail,
                    message: await getMessage("auth.account_deleted"),
                });
            } else if (getUser.otp_expired_at > 0) {
                return response(config.http_status_ok, {
                    status: config.status_fail,
                    message: await getMessage("auth.verify_first_to_edit_profile"),
                });
            } else {
                await modelService.update(
                    db.User,
                    {
                        id: getUser.id,
                    }, {
                    updated_at: currentTime
                },
                    req
                );
                return response(config.http_status_ok, {
                    status: config.status_success,
                    message: await getMessage("auth.otp_verified_success"),
                });
            }
        }
    } catch (error) {
        logMessage(error, req);
        throw error;
    }
}