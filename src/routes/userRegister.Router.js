import {
  registerUser,
  loginUser,
  logOutUser,
  refreshAccessToken,
  changePassword,
  getCurrentUser,
  updateAvatarImage,
  updateUserDetails,
  updateCoverImage,
  getUserChannelProfile,
  getWatchHistory,
} from "../controllers/user.controller.js";

import { Router } from "express";
import { upload } from "../middleware/multer.middleware.js";
import { verifyJwt } from "../middleware/auth.middleware.js";
const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),

  registerUser
);

router.route("/login").post(loginUser);

router.route("/logout").post(verifyJwt, logOutUser);
router.route('/refreshToken').post(refreshAccessToken)

router.route('/change-password').post(verifyJwt, changePassword)
router.route('/current-user').get(verifyJwt, getCurrentUser);
router.route('/update-account').patch(verifyJwt, updateUserDetails)
router.route("/avatar").patch(verifyJwt, upload.single("avatar"), updateAvatarImage)
router.route('/cover-image').patch(verifyJwt, upload.single('coverImage'), updateCoverImage)

router.route('/c:/username').get(verifyJwt, getUserChannelProfile)

router.route('/history').get(verifyJwt, getWatchHistory)

export default router;
