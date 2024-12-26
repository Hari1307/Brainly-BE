import * as bcrypt from 'bcrypt';
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import z from "zod";
import { userMiddleware } from './authMiddleware';
import { JWT_SECRET } from './config';
import { ContentModel, LinkModel, UserModel } from "./db";
import { random } from './utils';
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect("mongodb://localhost:27017/brainly");

app.post("/api/v1/signup", async (req, res) => {
    const requiredBody = z.object({
        username: z.string().min(5).max(40),
        password: z.string().min(3).max(15),
    });

    const parsedDataWithSafe = requiredBody.safeParse(req.body);

    if (!parsedDataWithSafe) {
        res.json({
            message: "incorrect format of input data",
            error: parsedDataWithSafe
        })
        return;
    }
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 5);

        await UserModel.create({
            username: username,
            password: hashedPassword
        });

        res.json({
            message: "You are signed up"
        })
    } catch (e) {
        console.log(e);
    }
})

app.post("/api/v1/signin", async (req, res) => {
    try {
        const { username, password } = req.body;

        const fuser = await UserModel.findOne({ username });

        const isValid = bcrypt.compare(password, fuser?.password as string);

        if (!isValid && !fuser) {
            res.status(403).json({
                message: "Incorrect credentials / unauthorized"
            })
        } else {
            const token = jwt.sign({
                userId: fuser?._id
            }, JWT_SECRET);

            res.json({
                token: token,
                message: "Signed In Successfully"
            })
        }
    } catch (e) {
        console.log(e);
    }
})

// @ts-ignore
app.post("/api/v1/content", userMiddleware, async (req, res) => {
    try {
        const { link, type, title } = req.body;
        // @ts-ignore
        const userId = req.userId;

        const _newContent = await ContentModel.create({ link, title, type, userId });

        res.status(201).json({ content: _newContent });
    }
    catch (e) {
        console.log(e);
        res.status(500).json({ message: "Failed to create content" });
    }
    // .populate("userId","username") <only trying to get username from the user table not all fields> this will be used to get users information based on the user id when we are trying to get the info of the content from content table
})


//@ts-ignore
app.get("/api/v1/content", userMiddleware, async (req, res) => {
    try {
        // @ts-ignore
        const userId = req.userId;
        const content = await ContentModel.find({ userId }).populate("userId", "username");
        res.status(200).json({ content });
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: "Failed to create content" });
    }
})

//@ts-ignore
app.delete("/api/v1/content", userMiddleware, async (req, res) => {
    try {
        const contentId = req.body.contentId;

        //@ts-ignore
        const userId = req.userId;

        const deletedContent = await ContentModel.deleteMany({ _id: contentId, userId: userId });

        res.status(200).json(deletedContent);
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: "Failed to create content" });
    }
})

// @ts-ignore
app.post("/api/v1/brain/share", userMiddleware, async (req, res) => {
    const share = req.body.share;
    // @ts-ignore
    const userId = req.userId;

    if (share) {
        const existingLink = await LinkModel.findOne({ userId });
        if (existingLink) {
            res.json({
                message: "access already granted",
                hash: existingLink.hash
            })
            return;
        }
        const newLink = await LinkModel.create({
            userId: userId,
            hash: random(5)
        })
        res.json({
            message: "access granted",
            hash: newLink.hash
        })
    } else {
        await LinkModel.deleteOne({
            userId: userId
        })

        res.json({ message: "Access is removed" });
    }

})

app.get("/api/v1/brain/:shareLink", async (req, res) => {
    const hash = req.params.shareLink;

    const validLink = await LinkModel.findOne({ hash });

    const userId = validLink?.userId;

    const user = await UserModel.findById({ _id: userId });

    if (validLink) {
        const content = await ContentModel.find({ userId });

        res.json({
            username: user?.username,
            content
        });
    } else {
        res.status(411).json({ message: "Invalid link" })
    }
})


app.listen(3000, () => { console.log("Server is started at port 3000") })