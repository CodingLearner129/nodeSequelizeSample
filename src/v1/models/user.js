"use strict";
import { Model } from "sequelize";

export default (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }

  User.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    country_code: {
      type: DataTypes.STRING(15),
      defaultValue: "",
    },
    phone: {
      type: DataTypes.STRING(15), // Treat phone as string for international formats
      defaultValue: "",
    },
    full_name: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
    dob: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
    profile: {
      type: DataTypes.STRING, // Assuming profile and verification_profile are objects
      defaultValue: "",
    },
    gender: {
      type: DataTypes.BIGINT(10),
      defaultValue: 0,
      comment: "0 = female, 1 = male, 2 = prefer not to say",
    },
    auth_token: {
      type: DataTypes.STRING(255),
      defaultValue: "",
    },
    blocked_at: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
    },
    created_at: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
    },
    updated_at: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
    },
    deleted_at: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: false,
  });
  // Define indexes
  return User;
};
