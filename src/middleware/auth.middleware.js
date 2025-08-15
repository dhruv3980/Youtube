import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

export const verifyJwt = asyncHandler(async (req, res, next) => {
  try {
    // extract token from cookie
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");
      

    if (!token) {
      throw new ApiError(401, "Unautorized access");
    }

    // verify jwt

    const decoded_Token = await jwt.verify(
      token,
      process.env.Access_Token_Secret
    );

    const user = await User.findById(decoded_Token?._id).select(
      "-refreshToken -password"
    );

    if (!user) {
      throw new ApiError(401, "invalid access Token");
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "invalid token access");
  }
});
