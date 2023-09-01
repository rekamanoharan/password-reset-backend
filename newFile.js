import {
  getuser,
  passwordGenerator,
  createuser,
  passwordUpdate,
  updateuser,
  updateuserlastseen,
} from "./DbQueries.js";

// to create hashed password
import bcrypt from "bcrypt";
import express from "express";

// To create token & verify token
import jwt from "jsonwebtoken";
// To send mail via nodejs
import nodemailer from "nodemailer";
// To hide confidential info
import dotenv from "dotenv";

dotenv.config(); // It helps to store all the keys from .env file to the process.env

const router = express.Router();

// Router  the url which starts with /users it will routed this link

// Sign up
router.route("/signup").post(async (request, response) => {
  
  const { Firstname, Lastname, Mailid, Password } = request.body;
  // From the body the above information are taken

  // After getting the mailid it is sent to the database for verification of the user
  const data = await getuser({ Mailid });
  // console.log(data);

  // To check already the mail id exists in the database & the length of the password is smaller following conditions will take place
  if (data) {
    return response.status(400).send({ msg: "Mailid already exists" });
  }
  if (Password.length < 8) {
    return response.status(400).send({ msg: "Password must be longer" });
  }
  // Once the user is verified the below function will take place

  const Created = new Date().toString(); // Account Created time & date

  const LastVisited = Created; // Last visited time & date
  
  const hashedPassword = await passwordGenerator(Password); // Using hashed function the hashed password is generated

  // After all the above conditions are satisfied the account is created in the database
  const createData = await createuser({
    Firstname,
    Lastname,
    Mailid,
    Password: hashedPassword,
    Created,
    LastVisited,
  });
  // console.log(createData);
  const result = await getuser({ Mailid });
  response.send(result);
});

// Login Part
router.route("/login").post(async (request, response) => {

    const { Mailid, Password } = request.body;
  // The input from the user is taken via request

  const data = await getuser({ Mailid });
  // The login credentials are sent to the mongodb to verify the user

  if (!data) {
    // If the condition satisfies the user is not found in the database
    return response
      .status(400)
      .send({ msg: "Invalid login credentials : mailid" });
  }

  const { Password: dbPassword, LastVisited } = await data;
  // password & last visited time is taken from the database
  const passwordMatch = await bcrypt.compare(Password, dbPassword);
  // Using the hash function the hashed password is checked with the current entered password
  const date = new Date().toString();
  // to get login time & date
  if (passwordMatch) {
    // Once the user is verified the random string called token is generated
    const token = jwt.sign({ id: data._id }, process.env.key);
    // console.log(token);

    // To update the last visited time
    const lastseenupdate = await updateuserlastseen({
      Mailid,
      date,
      LastVisited,
    });
    return response.send({ msg: "Login successful", token });
  } else {
    // if password doesn't match
    return response
      .status(400)
      .send({ msg: "Invalid login credentials : Password" });
  }
});

router.route("/forgotpassword").post(async (request, response) => {
  const { Mailid } = request.body;
  let data = await getuser({ Mailid });
  // The mailid is taken from the request
  if (!data) {
    // If the mailid is not found in the database
    return response
      .status(400)
      .send({ msg: "Invalid login credentials : mailid" });
  }
  // If the mailid is present in the database,token  is  generated for the user
  const token = jwt.sign({ id: data._id }, process.env.key);
  //  The generated token will replace the old password
  const replacePassword = await passwordUpdate({ Mailid, token });
  // console.log(replacePassword);
  let updatedResult = await getuser({ Mailid });
  // console.log(updatedResult);

  // mail
  Mail(token, Mailid);
  // Using nodemailer the token will be sent to the registered Mailid
  return response.send({ updatedResult, token });
});

// After clicking the link in the mail,which redirects to another page in that the request is made
router.route("/forgotpassword/verify").get(async (request, response) => {

    // From the mail link the token was taken and it is placed in the header for further verification
  const token = await request.header("x-auth-token");

  // Token is verified using JWT
  const tokenVerify = await getuser({ Password: token });

  // Using the token the user is verified in which the token replaced the old password before
  //    console.log( tokenVerify,"tokenverified");

  if (!tokenVerify) {
    //    If the token does not match
    return response.status(400).send({ msg: "Invalid Credentials" });
  } else {
    return response.send({ msg: "Matched" });
  }
});

router.route("/updatepassword").post(async (request, response) => {
  {
    // After the verification the new password is taken from the body of the request
    const { Password, token } = request.body;
    // console.log(request.body);

    if (Password.length < 8) {
      return response.status(401).send({ msg: "Password Must be longer" });
    }
    const data = await getuser({ Password: token });
    // The user is again verified using the same token which was sent before

    if (!data) {
      return response.status(401).send({ msg: "Invalid credentials" });
    }
    const { Mailid } = data;
    // console.log(Mailid);

    // after the necessary verification the password is encrypted using hashed function
    const hashedPassword = await passwordGenerator(Password);

    // After the generation of hashed password it will replace the token which is stored as a password
    const passwordUpdate = await updateuser({
      Mailid,
      Password: hashedPassword,
    });
    const result = await getuser({ Mailid });

    return response.send(result);
  }
});

function Mail(token, Mailid) {
  console.log(token, Mailid);
  const transport = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.email,
      pass: process.env.password,
    },
  });

  // Deployed URL -Netlify
  // const link = `https://pass-res-fl.netlify.app/forgotpassword/verify/${token}`;

  // Deployed URL -Heroku
  const link = `- https://react-password-reset-flow.herokuapp.com/forgotpassword/verify/${token}`;

  // Local URL
  // const link = `http://localhost:3000/forgotpassword/verify/${token}`;

  const mailOptions = {
    from: process.env.email,
    to: Mailid,
    // to: Mailid,
    subject: "Mail from the Server",
    html: `<a href=${link}>Click the link to reset the password</a>`,
  };

  transport.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.log("err");
    } else {
      console.log("status", info.response);
    }
  });
}

export const userRouter = router;
