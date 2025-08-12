import {v2 as cloudinary} from "cloudinary";
import fs from "fs"

cloudinary.config({
    cloud_name:process.env.Cloudinary_Cloud_Name,
    api_key:process.env.Cloudinary_Cloud_Api_Key,
    api_secret: process.env.Cloudinary_Cloud_Api_Secret
})



const uploadToCloudinary = async function(localFilePath){
   try{

        if(!localFilePath) return null;
        const response=await cloudinary.uploader.upload(localFilePath, {
            resource_type:"auto",
            folder:"Youtube"
        })

         // Ensure local file is removed even if upload fails
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        return response


   }catch(err){
        // Ensure local file is removed even if upload fails
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        return null

   }
}

export {uploadToCloudinary}