const SECTION_MATCHER = /^\/$|top|new|show|ask|job/;
const STORY_MATCHER = /story\/(\d+$)/;

const express = require("express");
const fetch = require("node-fetch");
const path = require("path");
const compression = require("compression");
const app = express();
const port = process.env.PORT || 3001;
const API_BASE = "https://hacker-news.firebaseio.com/v0";
const MAX_AGE = "24h";
const jsdom = require("jsdom");
const dom = require("./app/app");
const request = require("request");
const pug = require("pug");
const renderIndex = pug.compileFile("./views/index.pug");

app.set("view engine", "pug");
app.use(compression());
app.use(express.static(path.join(__dirname, "app"), { maxage: MAX_AGE }));

function fetchItems(ids) {
  return Promise.all(
    ids.map(id => fetch(`${API_BASE}/item/${id}.json`).then(v => v.json()))
  );
}

function fetchStories(scope, offset, num) {
  return fetch(API_BASE + `/${scope}.json`)
    .then(v => v.json())
    .then(ids =>
      fetchItems(ids.slice(offset, num)).then(stories =>
        stories.map((v, idx) => {
          v.idx = idx + parseInt(offset, 10);
          return v;
        })
      )
    );
}

app.get("/stories.json", (req, res) => {
  const scope = req.query.scope;
  const offset = req.query.offset;
  const num = req.query.num;
  fetchStories(scope, offset, num)
    .then(v => res.json(v))
    .catch(e => console.log(e));
});

app.get("/items.json", (req, res) => {
  fetchItems(req.query.ids.split(","))
    .then(v => res.json(v))
    .catch(e => console.log(e));
});

function renderRoot(req, res, scope = "topstories") {
  jsdom.env(renderIndex(), (err, window) => {
    const app = window.document.querySelector("#a");

    fetchStories(scope, 0, 30)
      .then(stories => {
        dom.showStories = dom.showStories.bind(window);
        dom.showStories(app, stories);
        res.send(window.document.documentElement.outerHTML);
      })
      .catch(e => {
        res.status(500);
        res.send(e.message);
      });
  });
}

function getScopeFromPath(path) {
  if (path === "/") {
    return "topstories";
  }

  return `${path.match(SECTION_MATCHER)[0]}stories`;
}

app.get("*", (req, res) => {
  let linkHeaders = ["</cc.js>; rel=preload; as=script"];

  if (req.path.match(SECTION_MATCHER)) {
    const scope = getScopeFromPath(req.path);
    linkHeaders.push(
      `</stories.json?scope=${scope}&offset=0&num=30>; crossorigin; rel=preload; as=fetch')`
    );
    res.header("link", linkHeaders);
    renderRoot(req, res, scope);
  } else if (req.path.match(STORY_MATCHER)) {
    // For now just punt the render to the client.
    res.send(renderIndex());
  } else {
    res.status(404);
    res.end();
  }
});

app.listen(port, () => {
  console.log("Server running on " + port);
});
