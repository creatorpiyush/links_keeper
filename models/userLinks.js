const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
  },

  link: {
    title: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    clicks: {
      type: Number,
      default: 0,
    },
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

const UsersLinks = mongoose.model("UsersLinks", schema);

module.exports = UsersLinks;
