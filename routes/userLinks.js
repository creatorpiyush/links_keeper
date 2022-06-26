const route = require("express").Router();

const { body, validationResult } = require("express-validator");

const db = require("../models");

const moment = require("moment");

// add Link
route.get("/addLink", (req, res) => {
  if (req.session.user) {
    res.render("addLink");
  } else {
    res.redirect("/user/login");
  }
});

route.post("/addLink", (req, res) => {
  const { title, url, description, isPrivate } = req.body;

  // * Validate
  body("title", "Title is required").notEmpty();
  body("url", "URL is required").notEmpty();

  // console.log(isPrivate);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors.array());
    return res.status(422).json({ errors: error });
  }

  let userEmail = req.session.user.email;

  // console.log(title, url, description, isPrivate);

  // * Check if Link already exists
  db.Link.findOne({
    "link.url": {
      $eq: url,
    },
    email: userEmail,
  }).then((link) => {
    if (link) {
      // return res.status(400).json({
      //   message: "Link already exists",
      // });

      return res.status(400).render("addLink", {
        error: "Link already exists",
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
      isPrivate,
    })
      .then((link) => {
        res.redirect("/dashboard");
      })
      .catch((err) => {
        console.log(err);
        res.status(400).json(err);
      });
  });
});

// update Link
route.get("/updateLink/:id", (req, res) => {
  if (req.session.user) {
    const id = req.params.id;

    db.Link.findOne({
      _id: id,
    }).then((link) => {
      if (link) {
        res.render("updateLink", {
          link,
        });
      } else {
        res.status(400).render("error", {
          error: "Link not found",
        });
      }
    });
  } else {
    res.redirect("/user/login");
  }
});

route.post("/updateLink/:id", (req, res) => {
  const { title, url, description, isPrivate } = req.body;

  const id = req.params.id;

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
        isPrivate: isPrivate,
        updated_at: Date.now(),
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

      return res.status(200).redirect("/dashboard");

      res.json(link);
    })
    .catch((err) => {
      console.log(err);
      res.status(400).json(err);
    });
});

// delete Link
route.delete("/deleteLink/:id", (req, res) => {
  // const { id } = req.body;

  const id = req.params.id;

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
      return res.status(200).redirect("/dashboard");
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
route.post("/trackLink/:id", (req, res) => {
  const { id } = req.params;

  // track Link
  db.Link.findByIdAndUpdate(
    {
      _id: id,
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

// get link stats
route.get("/LinkStats/:id", (req, res) => {
  const id = req.params.id;

  db.Link.findById(id)
    .then((link) => {
      const linkData = {
        id: link._id,
        title: link.link.title,
        url: link.link.url,
        description: link.link.description,
        clicks: link.link.clicks,
        created_at: moment(link.created_at).format("Do MMM YYYY h:mm:ss a"),
        updated_at: moment(link.updated_at).format("Do MMM YYYY h:mm:ss a"),
        isPrivate: link.isPrivate,
      };

      return res.render("linkStats", { link: linkData });
      // res.json(link);
    })
    .catch((err) => {
      console.log(err);
      res.status(400).json(err);
    });
});

module.exports = route;
