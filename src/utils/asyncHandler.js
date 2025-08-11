const asyncHandler = (requestHandler)=>{
    (req,res,next)=>{
        Promise.resolve(requestHandler(req,res,next))
        .catch(err=> next(err))
    }
}


export {asyncHandler}



// const hadleasynrequest = (fn)=> async(req,res,next)=>{
//     try{
//         await fn(req,res,next)

//     }catch(err){
//         console.log("something wrong while connected with db", err)
//         next(err)
//     }
// }