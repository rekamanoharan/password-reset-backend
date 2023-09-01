import bcrypt from "bcrypt";
import { client } from "./server.js";


// Hashed Function
async function passwordGenerator(Password) {
    const rounds = 10;
    const salt = await bcrypt.genSalt(rounds);
    const hashedPassword = await bcrypt.hash(Password, salt);
    return hashedPassword;
}


// Getting user from the DB
async function getuser(userdata) {
    let result = await client.db('movielist').collection('users').findOne( userdata );
    return result;
}


// Creating data for the user
async function createuser(data) {
    return await client.db('movielist').collection('users').insertOne(data);
}


// After forgot password,here the token will update the existing password
async function passwordUpdate(userdata)
{
    let {Mailid,token}=userdata
    let result=await client.db('movielist').collection('users').updateOne({Mailid},{$set:{Password:token}})
    return result
}


// New Password will be updated
async function updateuser(userdata)
{
    const{Mailid,Password}=userdata
    let result=await client.db('movielist').collection('users').updateOne({Mailid},{$set:{Password:Password}})
    return result;
}


// To update the user last visited time & date
async function updateuserlastseen(userdata)
{
    const{Mailid,date,LastVisited}=userdata
    let result=await client.db('movielist').collection('users').updateOne({Mailid},{$set:{LastVisited:date}})
    return result;
}


export{passwordGenerator,
    getuser,
   createuser,
   passwordUpdate,
   updateuser,
   updateuserlastseen
}