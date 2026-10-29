"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app_1 = __importDefault(require("./app"));
const PORT = Number(process.env.PORT) || 3001;
app_1.default.listen(PORT, () => {
    console.log(`Storeroom server listening on port ${PORT}`);
    console.log(`Keep building the future`);
});
