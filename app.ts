import dotenv from "dotenv";
import express from "express";
import app from "./server";

dotenv.config();

app.use(express.json());
