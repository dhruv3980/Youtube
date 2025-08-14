import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.models.js"
import { uploadToCloudinary } from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js"

const registerUser = asyncHandler(async(req, res)=>{
    // get data from frontend
    const {fullName, userName, email, password} = req.body;

    if(
        [fullName, email, userName, password].some(field=>field?.trim()==="")
    ) {
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
        $or:[{userName}, {email}]
    })


    if(existedUser){
        throw new ApiError(409, "User with email or username is already exist")
    }

    const avatarLocalPath =req.files?.avatar[0]?.path
    // console.log(req.files);

    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath){
        throw new ApiError(400, " avatar is required");
    }


    const avatar =await uploadToCloudinary(avatarLocalPath)

    const coverImage = await uploadToCloudinary(coverImageLocalPath);

    if(!avatar){
         throw new ApiError(400, " avatar is required");
    }

    const user = await User.create({
        fullName,
        email,
        userName:userName.toLowerCase(),
        avatar:avatar.secure_url,
        coverImage:coverImage?.url||"",
        password,
        

    })


    const createdUser = await User.findById(user._id).select("-password -refreshToken")


    if(!createdUser){
        throw new ApiError(500, "something went wrong while creating user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User register successfully")
    )

})


export {registerUser}