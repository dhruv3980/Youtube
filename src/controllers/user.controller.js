import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import fs from "fs"

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

  // After upload
if (avatarLocalPath) fs.unlinkSync(avatarLocalPath);
if (coverImageLocalPath) fs.unlinkSync(coverImageLocalPath);


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
      $unset: { refreshToken: 1 },
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

const refreshAccessToken = asyncHandler(async(req,res)=>{
  const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken
  if(!incomingRefreshToken){
    throw new ApiError(401, "Unathorized request");
  }

  try{
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.Refresh_Token_Secret)

    const user = await User.findById(decodedToken?._id);

    if(!user){
      throw new ApiError(401, "Invalid refresh token")
    }

    if(incomingRefreshToken!==user.refreshToken){
      throw new ApiError(404, "invalid token details");
    }

    // generate token
    const {refreshToken, accessToken}=generateRefereshAndAccessToken(user._id);
    const options = {
      httpsOnly:true,
      secure:true
    }
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie('refreshToken', refreshToken, options)
    .json(
      new ApiResponse(200, {accessToken, refreshToken}, "access token refreshed")
    )

  }catch(error){

    throw new ApiError(401, error?.message || "Invalid token details")

  }


})

const changePassword = asyncHandler(async(req,res)=>{
  const {oldPassword, newPassword} = req.body;

  // now check these field comes from req ki body
  if(!oldPassword || !newPassword){
      throw new ApiError(401, "Password is not incorrect")
  }

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if(!isPasswordCorrect){
    throw new ApiError(401, "Invalid old password")
  }

  user.password = newPassword;
  await user.save({validationBeforeSave:false})

  return res
  .status(200).
  json(
    new ApiResponse(200, {}, "password changed successfully")
  )
})

const getCurrentUser = asyncHandler(async(req,res)=>{
  return res.status(200)
  .json(
    new ApiResponse(200,  req.user, "current user fetched successfully")
  )
})

const updateUserDetails = asyncHandler(async(req,res)=>{
  const {fullName, email} = req.body;
  if(!(fullName && email)){
    throw new ApiError(404, "enter fullname and email")
  }

  const user =await User.findByIdAndUpdate(req.user?._id,
  {
    $set:{fullName, email}

  },{new:true}).select('-password')

  return res.status(200)
  .json(
    new ApiResponse(200, user, "User Details are updated")
  )




})

const updateAvatarImage = asyncHandler(async(req,res)=>{
  const avatar = req.file?.path;
  if(!avatar){
    throw new ApiError(400, "Avatar file is missing")
  };

  const avatarurl= await uploadToCloudinary(avatar);

  if(!avatarurl.url){
    throw new ApiError(400, "Avatar file is missing")
  }

  const user = await User.findByIdAndUpdate(req.user?._id,
    {$set:{avatar:avatarurl.url}},{new:true}
  ).select('-password')

  // now delete avatar
  fs.unlinkSync(avatar);


  if(!user){
    throw new ApiError(400, "Something went wrong")

  }

  return res
  .status(200)
  .json(200, user, "Avatar updated successfully")



})

const updateCoverImage = asyncHandler(async(req,res)=>{
  const localFilePath = req.file?.path;
  if(!localFilePath){
    throw new ApiError(404, "Please select a valid coverimage")
  }
  const coverImageUrl = await uploadToCloudinary(localFilePath);
  if(!coverImageUrl.url){
    throw new ApiError(500, "Something went wrong while uploading cover image on cloudinary");
  }
  const user = await user.findByIdAndUpdate(req.user?._id, {
    coverImage:coverImageUrl.url
  }, {new:true}).select('-password')

  if(localFilePath) fs.unlinkSync(localFilePath)


  return res.status(200)
  .json(
    new ApiResponse(200, user , 'Cover image updated successfully')
  )
})


 const getUserChannelProfile  = asyncHandler(async(req,res)=>{
  const{userName} = req.params;

  if(!userName?.trim()){
    throw new ApiError(400, "username is missing")
  }

  const channel=await User.aggregate([
    {
      $match:{
        userName:userName.toLowerCase()
      }
    },
    {
      $lookup:{
        from:"subscriptions",
        localField:"_id",
        foreignField:"channel",
        as:"subscribers"
      }
    
    },
    {
      $lookup:{
        from:"subscriptions",
        localField:"_id",
        foreignField:"subscriber",
        as:"subscribedTo"
      }
    },

    {
      $addFields:{
        subscriberCount:{
          $size:"$subscribers"
        },
        channelSubscribedCount :{
          $size:"$subscribedTo"
        },
        isSubscribed:{
          $cond:{
            if:{$in:[req.user?._id, "$subscribers.subscriber"]},
            then:true,
            else:false
          }
        }
      }
    },
    {
      $project:{
        fullName:1,
        userName:1,
        email:1,
        subscriberCount:1,
        channelSubscribedCount:1,
        isSubscribed:1,
        avatar:1,
        coverImage:1,
      

      }
    }

  ])

  if(!channel?.length){
    throw new ApiError(404, "Channel doesnot exist")
  }

  return res
  .status(200)
  .json(
    new ApiResponse(200, "User Channel details fetched successfully")
  )


})

const getWatchHistory = asyncHandler(async(req,res)=>{
  const user = await User.aggregate([
    {
      $match:{
        _id:new mongoose.Types.ObjectId(req.user._id)

      }
    },
    {
      $lookup:{
        from:"videos",
        localField:"watchHistory",
        foreignField:"_id",
        as:"watchHistory" ,

        pipeline:[
          {
            $lookup:{
              from:"users",
              localField:"owner",
              foreignField:"_id",
              as:"owner",
              pipeline:[
                {
                  $project:{
                    fullName:1,
                    userName:1,
                    avatar:1

                  }
                }
              ]
            }
          },
          {
            $addFields:{
              owner:{
                $first:"$owner"
              }
            }
          }

        ]
      }
    }
  ])

  return res.status(200)
  .json(
    new ApiResponse(200, user[0].watchHistory, "watch history fetch successfully")
  )
})

export { registerUser, loginUser, logOutUser, refreshAccessToken, changePassword, getCurrentUser, updateUserDetails, updateAvatarImage, updateCoverImage, getUserChannelProfile, getWatchHistory };
