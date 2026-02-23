const express = require("express");
const cors = require("cors");

const mapsRouter = require("./routes/maps");
const reportsRouter = require("./routes/reports");
const { notFoundHandler, errorHandler } = require("./utils/errors");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "mental-maps-backend", version: "v1" });
});

app.use("/api/v1/maps", mapsRouter);
app.use("/api/v1/reports", reportsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
