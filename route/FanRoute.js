import express from "express";
import {login, buySong, getAllSongs} from "../controller/FanController.js";

const router = express.Router();

router.post("/login/Fan", login);
router.post("/buySong", buySong);
router.get("/songs", getAllSongs); // New endpoint to get all songs
export default router;