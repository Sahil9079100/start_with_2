// server.js
import dotenv from "dotenv";
import ImageKit from "imagekit";

dotenv.config();
;

console.log("ImageKit keys:", 
  process.env.IMAGEKIT_PUBLIC_KEY ,
  process.env.IMAGEKIT_PRIVATE_KEY ,
 process.env.IMAGEKIT_URL_ENDPOINT 
);

 const imagekit = new ImageKit({
  publicKey: "public_maE3lQB81istnpqewx94HwKvNcc=",
  privateKey: "private_U25obvw6eBeXIsV3bIKGIcoWjFc=",
  urlEndpoint: "https://ik.imagekit.io/u86dpww16",
});

// Generate auth signature for frontend

export const imageendpoint = ( req , res  ) =>{

    const result = imagekit.getAuthenticationParameters();
    res.json({
      ...result,
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY || 'public_maE3lQB81istnpqewx94HwKvNcc=',
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/u86dpww16'
    });

}





