const route = require("express").Router();

const { body, validationResult } = require("express-validator");

const db = require("../models");

const mongoose = require("mongoose");

// add Link
route.post("/addLink", (req, res) => {
  const { title, url, description } = req.body;

  // * Validate
  body("title", "Title is required").notEmpty();
  body("url", "URL is required").notEmpty();

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors.array());
    return res.status(422).json({ errors: error });
  }

  let userEmail = req.session.user.email;

  // * Check if Link already exists
  db.Link.findOne({
    "link.url": {
      $eq: url,
    },
    email: userEmail,
  }).then((link) => {
    if (link) {
      return res.status(400).json({
        message: "Link already exists",
      });
    }

    const userLink = {
      title,
      url,
      description,
    };

    // * Create new Link
    db.Link.create({
      link: userLink,
      email: userEmail,
    })
      .then((link) => {
        res.json(link);
      })
      .catch((err) => {
        console.log(err);
        res.status(400).json(err);
      });
  });
});

// update Link
route.post("/updateLink", (req, res) => {
  const { title, url, description, id } = req.body;

  // * Validate
  body("title", "Title is required").notEmpty();
  body("url", "URL is required").notEmpty();

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors.array());
    return res.status(422).json({ errors: error });
  }

  // * Check if Link already exists
  db.Link.findByIdAndUpdate(
    {
      _id: id,
    },
    {
      $set: {
        "link.title": title,
        "link.url": url,
        "link.description": description,
      },
    },
    {
      new: true,
    }
  )
    .then((link) => {
      if (!link) {
        return res.status(400).json({
          message: "Link not found",
        });
      }

      res.json(link);
    })
    .catch((err) => {
      console.log(err);
      res.status(400).json(err);
    });
});

// delete Link
route.post("/deleteLink", (req, res) => {
  const { id } = req.body;

  // * Validate
  body("url", "URL is required").notEmpty();

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log(errors.array());
    return res.status(422).json({ errors: error });
  }

  let userEmail = req.session.user.email;

  // delete Link
  db.Link.findOneAndDelete({
    _id: id,
    email: userEmail,
  })
    .then((link) => {
      res.json(link);
    })
    .catch((err) => {
      console.log(err);
      res.status(400).json(err);
    });
});

// get all Links for user
route.get("/getLinks", (req, res) => {
  let userEmail = req.session.user.email;

  db.Link.find({
    email: userEmail,
  })
    .then((links) => {
      // console.log(links.length);

      res.json(links);
    })
    .catch((err) => {
      console.log(err);
      res.status(400).json(err);
    });
});

// track Link
route.post("/trackLink", (req, res) => {
  const { id } = req.body;

  // * Validate
  body("url", "URL is required").notEmpty();

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors.array());
    return res.status(422).json({ errors: error });
  }

  let userEmail = req.session.user.email;

  // track Link
  db.Link.findOneAndUpdate(
    {
      _id: id,
      email: userEmail,
    },
    {
      $inc: {
        "link.clicks": 1,
      },
    },
    {
      new: true,
    }
  )
    .then((link) => {
      res.json(link);
    })

    .catch((err) => {
      console.log(err);
      res.status(400).json(err);
    });
});

module.exports = route;
