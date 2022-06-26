const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },

  displayName: {
    type: String,
  },

  displayImage: {
    type: String,
  },

  displayCover: {
    type: String,
  },

  username: {
    type: String,
    unique: true,
    trim: true,
  },

  password: {
    type: String,
    required: true,
  },

  name: {
    type: String,
  },

  access_token: {
    type: String,
  },

  is_verified: {
    type: Boolean,
    default: false,
  },

  user_data: {
    type: Object,
    ref: "UserData",
  },

  forget_password_token: {
    type: String,
  },

  created_at: {
    type: Date,
    default: Date.now,
  },

  updated_at: {
    type: Date,
    default: Date.now,
  },
});

const Users = mongoose.model("User", schema);

module.exports = Users;
