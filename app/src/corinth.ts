import { Corinth } from "corinth.js";

export const corinth = new Corinth(
  process.env.NODE_ENV === "development" ? "/api" : ""
);
