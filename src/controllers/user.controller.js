import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const generateRefereshAndAccessToken = async (userid) => {
  try {
    const user = await User.findById(userid);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validationBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (err) {
    throw new ApiError(
      500,
      "Something went wrong while generate refresh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // get data from frontend
  const { fullName, userName, email, password } = req.body;

  if (
    [fullName, email, userName, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ userName }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username is already exist");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  // console.log(req.files);

  // const coverImageLocalPath = req.files?.coverImage[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, " avatar is required");
  }

  const avatar = await uploadToCloudinary(avatarLocalPath);

  const coverImage = await uploadToCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, " avatar is required");
  }

  const user = await User.create({
    fullName,
    email,
    userName: userName.toLowerCase(),
    avatar: avatar.secure_url,
    coverImage: coverImage?.url || "",
    password,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "something went wrong while creating user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, "createdUser", "User register successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // fetch data from req ki body
  // username and email validation
  //check user exist or not
  //password check
  // generate refresh and access token

  // send the response

  const { userName, email, password } = req.body;

  if (!(userName || email)) {
    throw new ApiError(401, "Enter userName and Email");
  }

  const user = await User.findOne({
    $or: [{ userName }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "invalid credentials");
  }

  const isAuthenticate = await user.isPasswordCorrect(password);

  if (!isAuthenticate) {
    throw new ApiError(401, "Invalid credentials");
  }

  // generate refresh and access token

  const { accessToken, refreshToken } = await generateRefereshAndAccessToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpsOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      200,
      {
        user: loggedInUser,
        accessToken,
        refreshToken,
      },
      "User Logged in successfully"
    );
});

const logOutUser = asyncHandler(async (req, res) => {
  // fetch req details
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined },
    },
    {
      new: true,
    }
  );

  const options = {
    httpsOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("refreshToken", options)
    .clearCookie("accessToken", options)
    .json(new ApiResponse(200, {}, "User LoggedOut successfully"));
});

export { registerUser, loginUser, logOutUser };
